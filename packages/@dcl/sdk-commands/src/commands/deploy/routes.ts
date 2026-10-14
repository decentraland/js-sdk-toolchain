import { timingSafeEqual } from 'crypto'
import { PassThrough } from 'stream'
import { Router } from '@well-known-components/http-server'
import { IHttpServerComponent } from '@well-known-components/interfaces'

import { CliComponents } from '../../components'
import { LinkerResponse } from '../../linker-dapp/routes'
import { deploymentCancelledError, IDeploymentComponent } from './deployment'
import { DeploymentState } from './state'

export const DEPLOY_RESOURCE_PATH = '/api/deploy'
export const SSE_HEARTBEAT_INTERVAL_MS = 15000
// Keeps the final state readable for clients following the deployment before the CLI exits.
export const FOLLOWED_SETTLE_DELAY_MS = 2000
export const SETTLE_DELAY_MS = 100
export const DEPLOY_TOKEN_HEADER = 'X-Deploy-Token'

export type DeployRoutesOptions = {
  deployment: IDeploymentComponent
  /** Required in the `X-Deploy-Token` header to cancel. Never exposed through the API. */
  deployToken: string
  isWorld: boolean
  /** Ends the CLI run successfully. */
  resolve: () => void
  /** Ends the CLI run with an error. */
  reject: (error: Error) => void
  onLinkerResponse?: (linkerResponse: LinkerResponse) => void
  heartbeatIntervalMs?: number
  followedSettleDelayMs?: number
}

function prefersAsync(request: IHttpServerComponent.IRequest): boolean {
  const prefer = request.headers.get('prefer') ?? ''
  return prefer.split(',').some((preference) => preference.split(/[;=]/)[0].trim().toLowerCase() === 'respond-async')
}

function acceptsEventStream(request: IHttpServerComponent.IRequest): boolean {
  return (request.headers.get('accept') ?? '').toLowerCase().includes('text/event-stream')
}

function hasDeployToken(request: IHttpServerComponent.IRequest, deployToken: string): boolean {
  const provided = Buffer.from(request.headers.get(DEPLOY_TOKEN_HEADER) ?? '')
  const expected = Buffer.from(deployToken)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

function stateEvent(state: DeploymentState): string {
  return `event: state\ndata: ${JSON.stringify(state)}\n\n`
}

/**
 * Exposes the deployment of this CLI run as a resource: POST starts it with the signed payload, GET
 * follows it (JSON or server-sent events) and DELETE cancels it.
 */
export function setDeployResourceRoutes(
  router: Router<object>,
  components: Pick<CliComponents, 'logger'>,
  options: DeployRoutesOptions
): Router<object> {
  const { logger } = components
  const { deployment, deployToken, isWorld, resolve, reject, onLinkerResponse } = options
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? SSE_HEARTBEAT_INTERVAL_MS
  const followedSettleDelayMs = options.followedSettleDelayMs ?? FOLLOWED_SETTLE_DELAY_MS
  let followed = false

  const settle = (end: () => void) => {
    setTimeout(end, followed ? followedSettleDelayMs : SETTLE_DELAY_MS)
  }

  const conflict = () => ({ status: 409, body: deployment.state.get() })

  router.post(DEPLOY_RESOURCE_PATH, async (ctx) => {
    const respondAsync = prefersAsync(ctx.request)
    let value: LinkerResponse
    try {
      value = (await ctx.request.json()) as LinkerResponse
    } catch {
      return { status: 400, body: { message: 'Invalid payload: the body must be JSON' } }
    }
    // Checked before validating, and after reading the body since another request may start it meanwhile.
    if (!deployment.canStart()) return conflict()
    if (!value || !value.address || !value.authChain || !value.chainId) {
      const errorMessage = `Invalid payload: ${Object.keys(value ?? {}).join(' - ')}`
      logger.error(errorMessage)
      if (!respondAsync) settle(resolve)
      return { status: 400, body: { message: errorMessage } }
    }

    onLinkerResponse?.(value)
    const running = deployment.run(value)

    if (respondAsync) {
      followed = true
      running.then(
        () => isWorld && settle(resolve),
        (error) => settle(() => reject(error))
      )
      return {
        status: 202,
        headers: { Location: DEPLOY_RESOURCE_PATH, 'Preference-Applied': 'respond-async' },
        body: deployment.state.get()
      }
    }

    try {
      await running
      if (isWorld) settle(resolve)
      return {}
    } catch (e) {
      settle(() => reject(e as Error))
      return { status: 400, body: { message: (e as Error).message } }
    }
  })

  router.get(DEPLOY_RESOURCE_PATH, async (ctx) => {
    followed = true
    if (!acceptsEventStream(ctx.request)) {
      return { status: 200, body: deployment.state.get() }
    }

    const stream = new PassThrough()
    let unsubscribe = () => {}
    let heartbeat: ReturnType<typeof setInterval> | undefined

    const close = () => {
      unsubscribe()
      if (heartbeat) clearInterval(heartbeat)
      if (!stream.writableEnded) stream.end()
    }
    const send = (state: DeploymentState) => {
      if (stream.destroyed || stream.writableEnded) return
      stream.write(stateEvent(state))
      if (state.phase === 'deployed' || state.phase === 'failed' || state.phase === 'cancelled') close()
    }

    stream.on('close', close)
    send(deployment.state.get())
    if (!stream.writableEnded) {
      unsubscribe = deployment.state.subscribe(send)
      heartbeat = setInterval(() => {
        if (!stream.destroyed && !stream.writableEnded) stream.write(': ping\n\n')
      }, heartbeatIntervalMs)
      heartbeat.unref?.()
    }

    return {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      },
      body: stream
    }
  })

  router.delete(DEPLOY_RESOURCE_PATH, async (ctx) => {
    if (!hasDeployToken(ctx.request, deployToken)) {
      return { status: 403, body: { message: 'Invalid or missing deploy token' } }
    }
    followed = true
    const outcome = deployment.cancel()
    if (outcome === 'final' || outcome === 'refused') return conflict()
    if (outcome === 'cancelled') {
      logger.warn('Deployment cancelled.')
      settle(() => reject(deploymentCancelledError()))
    } else {
      logger.warn('Cancelling the deployment...')
    }
    return { status: 202, body: deployment.state.get() }
  })

  return router
}
