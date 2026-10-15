import * as net from 'net'
import {
  createServerComponent,
  Router
} from '../../../../packages/@dcl/sdk-commands/node_modules/@well-known-components/http-server'
import { createRecordConfigComponent } from '../../../../packages/@dcl/sdk-commands/node_modules/@well-known-components/env-config-provider'
import {
  createDeployment,
  DeployContext,
  IDeploymentComponent
} from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/deployment'
import { setDeployResourceRoutes } from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/routes'
import { LINKER_CORS_OPTIONS } from '../../../../packages/@dcl/sdk-commands/src/run-dapp'
import { DeploymentResult, DeploymentState } from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/state'
import { LinkerResponse } from '../../../../packages/@dcl/sdk-commands/src/linker-dapp/routes'

type Server = { stop(): Promise<void>; url: string }

const DEPLOY_TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'

const payload = { address: '0x1', authChain: [{ type: 'SIGNER', payload: '0x1', signature: '' }], chainId: 1 }

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as net.AddressInfo
      server.close(() => resolve(address.port))
    })
  })
}

function createLogger() {
  return { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}

async function startServer(router: Router<object>): Promise<Server> {
  const port = await freePort()
  const logger = createLogger()
  const config = createRecordConfigComponent({ HTTP_SERVER_PORT: String(port), HTTP_SERVER_HOST: '127.0.0.1' })
  const server = await createServerComponent<object>(
    { config, logs: { getLogger: () => logger } as any },
    { cors: LINKER_CORS_OPTIONS }
  )
  server.use(router.allowedMethods())
  server.use(router.middleware())
  await server.start!({} as any)
  return { stop: () => server.stop!(), url: `http://127.0.0.1:${port}/api/deploy` }
}

function parseEvents(text: string): DeploymentState[] {
  return text
    .split('\n\n')
    .filter((block) => block.startsWith('event: state'))
    .map((block) => JSON.parse(block.split('\n')[1].slice('data: '.length)))
}

function settled(mock: jest.Mock): Promise<void> {
  return new Promise((resolve) => {
    const check = () => (mock.mock.calls.length > 0 ? resolve() : setTimeout(check, 5))
    check()
  })
}

function postDeploy(url: string, headers: Record<string, string> = {}, body: unknown = payload) {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  })
}

function cancelDeploy(url: string, headers: Record<string, string> = { 'x-deploy-token': DEPLOY_TOKEN }) {
  return fetch(url, { method: 'DELETE', headers })
}

describe('when using the deploy resource of the linker server', () => {
  let deploy: jest.Mock<Promise<DeploymentResult>, [LinkerResponse, DeployContext]>
  let deployment: IDeploymentComponent
  let resolve: jest.Mock
  let reject: jest.Mock
  let server: Server
  let isWorld: boolean
  let undeployFirst: boolean
  let uploadContext: DeployContext
  let finishUpload: (result: DeploymentResult) => void
  let failUpload: (error: Error) => void

  beforeEach(() => {
    isWorld = true
    undeployFirst = false
    resolve = jest.fn()
    reject = jest.fn()
    deploy = jest.fn((_response, context) => {
      uploadContext = context
      if (undeployFirst) context.startUndeploy()
      return new Promise<DeploymentResult>((res, rej) => {
        finishUpload = res
        failUpload = rej
        context.signal.addEventListener('abort', () => rej(new Error('This operation was aborted')))
      })
    })
  })

  async function start() {
    deployment = createDeployment({ deploy })
    const router = setDeployResourceRoutes(
      new Router(),
      { logger: createLogger() as any },
      {
        deployment,
        deployToken: DEPLOY_TOKEN,
        isWorld,
        resolve,
        reject,
        heartbeatIntervalMs: 30,
        followedSettleDelayMs: 10
      }
    )
    server = await startServer(router)
  }

  afterEach(async () => {
    await server?.stop()
    jest.resetAllMocks()
  })

  describe('and the client starts it asynchronously', () => {
    let response: Response
    let body: DeploymentState

    beforeEach(async () => {
      await start()
      response = await postDeploy(server.url, { prefer: 'respond-async' })
      body = await response.json()
    })

    it('should respond with a 202 Accepted', () => {
      expect(response.status).toBe(202)
    })

    it('should point to the deployment resource', () => {
      expect(response.headers.get('location')).toBe('/api/deploy')
    })

    it('should confirm the asynchronous preference', () => {
      expect(response.headers.get('preference-applied')).toBe('respond-async')
    })

    it('should respond with the uploading state', () => {
      expect(body).toEqual({ phase: 'uploading', upload: null, result: null, error: null, cancelRequested: false })
    })

    it('should start the deployment with the signed payload', () => {
      expect(deploy).toHaveBeenCalledWith(payload, expect.anything())
    })

    describe('and the client cancels it without the deploy token', () => {
      let cancel: Response
      let cancelBody: unknown
      let state: DeploymentState

      beforeEach(async () => {
        cancel = await cancelDeploy(server.url, {})
        cancelBody = await cancel.json()
        state = await (await fetch(server.url)).json()
      })

      it('should respond with a 403 Forbidden', () => {
        expect({ status: cancel.status, body: cancelBody }).toEqual({
          status: 403,
          body: { message: 'Invalid or missing deploy token' }
        })
      })

      it('should not abort the upload', () => {
        expect(uploadContext.signal.aborted).toBe(false)
      })

      it('should leave the state unchanged', () => {
        expect(state).toEqual(expect.objectContaining({ phase: 'uploading', cancelRequested: false }))
      })
    })

    describe('and the client cancels it with a wrong deploy token', () => {
      let cancel: Response

      beforeEach(async () => {
        cancel = await cancelDeploy(server.url, { 'x-deploy-token': DEPLOY_TOKEN.replace('a', 'b') })
      })

      it('should respond with a 403 Forbidden', () => {
        expect(cancel.status).toBe(403)
      })

      it('should not abort the upload', () => {
        expect(uploadContext.signal.aborted).toBe(false)
      })
    })

    describe('and the client sends a malformed payload while it runs', () => {
      let response: Response
      let body: DeploymentState

      beforeEach(async () => {
        response = await postDeploy(server.url, {}, { address: '0x1' })
        body = await response.json()
        await new Promise((r) => setTimeout(r, 150))
      })

      it('should respond with a 409 Conflict and the current state', () => {
        expect({ status: response.status, phase: body.phase }).toEqual({ status: 409, phase: 'uploading' })
      })

      it('should keep the CLI running', () => {
        expect(resolve).not.toHaveBeenCalled()
      })
    })

    describe('and the client starts it again', () => {
      let conflict: Response
      let conflictBody: DeploymentState

      beforeEach(async () => {
        conflict = await postDeploy(server.url, { prefer: 'respond-async' })
        conflictBody = await conflict.json()
      })

      it('should respond with a 409 Conflict and the current state', () => {
        expect({ status: conflict.status, phase: conflictBody.phase }).toEqual({ status: 409, phase: 'uploading' })
      })
    })

    describe('and the world deployment gets published', () => {
      let state: DeploymentState

      beforeEach(async () => {
        finishUpload({ entityId: 'bafkreientity', message: 'Live' })
        await settled(resolve)
        state = await (await fetch(server.url)).json()
      })

      it('should end the CLI run successfully', () => {
        expect(resolve).toHaveBeenCalled()
      })

      it('should expose the result', () => {
        expect(state).toEqual({
          phase: 'deployed',
          upload: null,
          result: { entityId: 'bafkreientity', message: 'Live' },
          error: null,
          cancelRequested: false
        })
      })
    })

    describe('and the deployment fails', () => {
      beforeEach(async () => {
        failUpload(new Error('Invalid signature'))
        await settled(reject)
      })

      it('should end the CLI run with the error', () => {
        expect(reject).toHaveBeenCalledWith(new Error('Invalid signature'))
      })
    })
  })

  describe('and the client starts it and waits for the outcome', () => {
    let responsePromise: Promise<Response>

    beforeEach(async () => {
      await start()
      responsePromise = postDeploy(server.url)
      await new Promise((r) => setTimeout(r, 20))
    })

    describe('and the world deployment gets published', () => {
      let response: Response

      beforeEach(async () => {
        finishUpload({ entityId: 'bafkreientity' })
        response = await responsePromise
        await settled(resolve)
      })

      it('should respond with a 200 once published', () => {
        expect(response.status).toBe(200)
      })

      it('should end the CLI run successfully', () => {
        expect(resolve).toHaveBeenCalled()
      })
    })

    describe('and the deployment fails', () => {
      let response: Response

      let body: unknown

      beforeEach(async () => {
        failUpload(new Error('Invalid signature'))
        response = await responsePromise
        body = await response.json()
      })

      it('should respond with a 400 and the error message', () => {
        expect({ status: response.status, body }).toEqual({
          status: 400,
          body: { message: 'Invalid signature' }
        })
      })
    })

    describe('and the client cancels it', () => {
      let response: Response
      let body: unknown
      let cancel: Response

      beforeEach(async () => {
        cancel = await cancelDeploy(server.url)
        response = await responsePromise
        body = await response.json()
        await settled(reject)
      })

      it('should accept the cancellation', () => {
        expect(cancel.status).toBe(202)
      })

      it('should abort the upload', () => {
        expect(uploadContext.signal.aborted).toBe(true)
      })

      it('should answer the held request with a 400 Deployment cancelled', () => {
        expect({ status: response.status, body }).toEqual({
          status: 400,
          body: { message: 'Deployment cancelled' }
        })
      })

      it('should end the CLI run with a DEPLOY_CANCELLED error', () => {
        expect(reject).toHaveBeenCalledWith(expect.objectContaining({ name: 'DEPLOY_CANCELLED' }))
      })
    })
  })

  describe('and the scene deploys to a catalyst', () => {
    let response: Response

    beforeEach(async () => {
      isWorld = false
      await start()
      const pending = postDeploy(server.url)
      await new Promise((r) => setTimeout(r, 20))
      finishUpload({ entityId: 'bafkreientity' })
      response = await pending
      await new Promise((r) => setTimeout(r, 150))
    })

    it('should respond with a 200 once published', () => {
      expect(response.status).toBe(200)
    })

    it('should leave ending the CLI run to the catalyst pointers check', () => {
      expect(resolve).not.toHaveBeenCalled()
    })
  })

  describe('and the payload is malformed', () => {
    let response: Response
    let body: unknown
    let state: DeploymentState

    beforeEach(async () => {
      await start()
      response = await postDeploy(server.url, { prefer: 'respond-async' }, { address: '0x1' })
      body = await response.json()
      state = await (await fetch(server.url)).json()
      await new Promise((r) => setTimeout(r, 150))
    })

    it('should respond with a 400 naming the received fields', () => {
      expect({ status: response.status, body }).toEqual({
        status: 400,
        body: { message: 'Invalid payload: address' }
      })
    })

    it('should keep awaiting the signature', () => {
      expect(state.phase).toBe('awaiting-signature')
    })

    it('should keep the CLI running so the client can sign again', () => {
      expect(resolve).not.toHaveBeenCalled()
    })
  })

  describe('and the client reads it as JSON', () => {
    let response: Response
    let body: unknown

    beforeEach(async () => {
      await start()
      response = await fetch(server.url, { headers: { accept: 'application/json' } })
      body = await response.json()
    })

    it('should respond with the current state', () => {
      expect({ status: response.status, body }).toEqual({
        status: 200,
        body: { phase: 'awaiting-signature', upload: null, result: null, error: null, cancelRequested: false }
      })
    })
  })

  describe('and the client follows it as server-sent events', () => {
    let response: Response
    let events: DeploymentState[]
    let text: string

    beforeEach(async () => {
      await start()
      await postDeploy(server.url, { prefer: 'respond-async' })
      response = await fetch(server.url, { headers: { accept: 'text/event-stream' } })
      uploadContext.state.reportUpload({ stage: 'uploading', sentBytes: 10, totalBytes: 100 })
      uploadContext.state.reportUpload({ stage: 'processing', sentBytes: 100, totalBytes: 100 })
      await new Promise((r) => setTimeout(r, 80))
      finishUpload({ entityId: 'bafkreientity' })
      text = await response.text()
      events = parseEvents(text)
    })

    it('should respond with an event stream that is not cached', () => {
      expect({
        type: response.headers.get('content-type'),
        cache: response.headers.get('cache-control')
      }).toEqual({ type: 'text/event-stream', cache: 'no-cache' })
    })

    it('should send the current state first and every change after it, closing after the final one', () => {
      expect(events.map((e) => [e.phase, e.upload?.stage ?? null])).toEqual([
        ['uploading', null],
        ['uploading', 'uploading'],
        ['uploading', 'processing'],
        ['deployed', 'processing']
      ])
    })

    it('should send heartbeat comments while the deployment runs', () => {
      expect(text).toContain(': ping\n\n')
    })
  })

  describe('and the client follows it after it ended', () => {
    let events: DeploymentState[]

    beforeEach(async () => {
      await start()
      await cancelDeploy(server.url)
      const response = await fetch(server.url, { headers: { accept: 'text/event-stream' } })
      events = parseEvents(await response.text())
    })

    it('should send the final state and close the stream', () => {
      expect(events.map((e) => e.phase)).toEqual(['cancelled'])
    })
  })

  describe('and the client disconnects from the event stream', () => {
    beforeEach(async () => {
      await start()
      const controller = new AbortController()
      const response = await fetch(server.url, { headers: { accept: 'text/event-stream' }, signal: controller.signal })
      await response.body!.getReader().read()
      controller.abort()
      await new Promise((r) => setTimeout(r, 50))
    })

    it('should stop following the state', () => {
      expect(deployment.state.subscriberCount()).toBe(0)
    })
  })

  describe('and the client cancels it while the server is still answering', () => {
    let cancel: Response
    let cancelBody: DeploymentState

    beforeEach(async () => {
      deploy.mockImplementationOnce(
        (_response, context) =>
          new Promise<DeploymentResult>((res) => {
            uploadContext = context
            finishUpload = res
          })
      )
      await start()
      await postDeploy(server.url, { prefer: 'respond-async' })
      cancel = await cancelDeploy(server.url)
      cancelBody = await cancel.json()
    })

    afterEach(async () => {
      finishUpload({ entityId: 'bafkreientity' })
      await settled(resolve)
    })

    it('should accept the cancellation', () => {
      expect(cancel.status).toBe(202)
    })

    it('should show the cancellation as requested while the outcome is pending', () => {
      expect(cancelBody).toEqual(expect.objectContaining({ phase: 'uploading', cancelRequested: true }))
    })
  })

  describe('and the client cancels it while the world is being undeployed', () => {
    let cancel: Response
    let cancelBody: DeploymentState

    beforeEach(async () => {
      undeployFirst = true
      await start()
      await postDeploy(server.url, { prefer: 'respond-async' })
      cancel = await cancelDeploy(server.url)
      cancelBody = await cancel.json()
    })

    afterEach(async () => {
      finishUpload({ entityId: 'bafkreientity' })
      await settled(resolve)
    })

    it('should respond with a 409 Conflict and the undeploying state', () => {
      expect({ status: cancel.status, body: cancelBody }).toEqual({
        status: 409,
        body: expect.objectContaining({ phase: 'undeploying', cancelRequested: false })
      })
    })

    it('should not abort the deployment', () => {
      expect(uploadContext.signal.aborted).toBe(false)
    })
  })

  describe('and a browser preflights a cancellation from another origin', () => {
    let response: Response

    beforeEach(async () => {
      await start()
      response = await fetch(server.url, {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'DELETE',
          'access-control-request-headers': 'x-deploy-token'
        }
      })
    })

    it('should allow the DELETE method', () => {
      expect(response.headers.get('access-control-allow-methods')).toContain('DELETE')
    })

    it('should allow the deploy token header', () => {
      expect(response.headers.get('access-control-allow-headers')?.toLowerCase()).toContain('x-deploy-token')
    })
  })

  describe('and the client cancels it before the signature', () => {
    let response: Response
    let body: DeploymentState

    beforeEach(async () => {
      await start()
      response = await cancelDeploy(server.url)
      body = await response.json()
      await settled(reject)
    })

    it('should respond with a 202 and the cancelled state', () => {
      expect({ status: response.status, phase: body.phase }).toEqual({ status: 202, phase: 'cancelled' })
    })

    it('should end the CLI run with a DEPLOY_CANCELLED error', () => {
      expect(reject).toHaveBeenCalledWith(expect.objectContaining({ name: 'DEPLOY_CANCELLED' }))
    })

    describe('and the client signs afterwards', () => {
      let conflict: Response

      beforeEach(async () => {
        conflict = await postDeploy(server.url, { prefer: 'respond-async' })
      })

      it('should respond with a 409 Conflict', () => {
        expect(conflict.status).toBe(409)
      })

      it('should not start the deployment', () => {
        expect(deploy).not.toHaveBeenCalled()
      })
    })

    describe('and the client cancels it again', () => {
      let again: Response
      let againBody: DeploymentState

      beforeEach(async () => {
        again = await cancelDeploy(server.url)
        againBody = await again.json()
      })

      it('should respond with a 409 Conflict and the final state', () => {
        expect({ status: again.status, phase: againBody.phase }).toEqual({ status: 409, phase: 'cancelled' })
      })
    })
  })
})
