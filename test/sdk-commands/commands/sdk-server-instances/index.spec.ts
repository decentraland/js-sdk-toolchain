import { initComponents, CliComponents } from '../../../../packages/@dcl/sdk-commands/src/components'
import { main, args } from '../../../../packages/@dcl/sdk-commands/src/commands/sdk-server-instances'
import { parseArgs } from '../../../../packages/@dcl/sdk-commands/src/logic/args'
import * as workspaceValidations from '../../../../packages/@dcl/sdk-commands/src/logic/workspace-validations'
import * as sceneValidations from '../../../../packages/@dcl/sdk-commands/src/logic/scene-validations'

const FAKE_PRIVATE_KEY = '0x' + '11'.repeat(32)
const SCENE_ID = 'bafkreiexample'
const TARGET = 'https://mp.example'

function jsonResponse(status: number, body: unknown): any {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body), json: async () => body }
}

describe('when running sdk-server-instances', () => {
  let components: CliComponents
  let fetchMock: jest.SpyInstance
  let logMock: jest.SpyInstance
  let infoMock: jest.SpyInstance
  let previousKey: string | undefined

  beforeEach(async () => {
    previousKey = process.env.DCL_PRIVATE_KEY
    process.env.DCL_PRIVATE_KEY = FAKE_PRIVATE_KEY
    components = await initComponents()
    fetchMock = jest.spyOn(components.fetch, 'fetch')
    logMock = jest.spyOn(components.logger, 'log').mockImplementation(() => undefined)
    infoMock = jest.spyOn(components.logger, 'info').mockImplementation(() => undefined)
  })

  afterEach(() => {
    process.env.DCL_PRIVATE_KEY = previousKey
    if (previousKey === undefined) delete process.env.DCL_PRIVATE_KEY
    jest.restoreAllMocks()
  })

  function run(argv: string[]) {
    return main({ args: parseArgs(argv, args), components })
  }

  function request(): [string, string] {
    const [url, init] = fetchMock.mock.calls[0]
    return [url, init.method]
  }

  function signedPayload(): string {
    const [, init] = fetchMock.mock.calls[0]
    return JSON.parse(init.headers['x-identity-auth-chain-1']).payload
  }

  function timestamp(): string {
    return fetchMock.mock.calls[0][1].headers['x-identity-timestamp']
  }

  describe('and it lists the instances of a world', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, {
          instances: [{ sceneId: SCENE_ID, baseParcel: '0,0', status: 'restarting', participants: 2 }]
        })
      )
      await run(['--world', 'MyWorld', '--target', `${TARGET}/`])
    })

    it('should GET the world instances collection', () => {
      expect(request()).toEqual([`${TARGET}/worlds/myworld.dcl.eth/instances`, 'GET'])
    })

    it('should sign the lowercased method and path with the metadata verbatim', () => {
      expect(signedPayload()).toBe(`get:/worlds/myworld.dcl.eth/instances:${timestamp()}:{}`)
    })

    it('should print each instance with its parcel, status and players', () => {
      expect(logMock).toHaveBeenCalledWith(`  ${SCENE_ID}  parcel 0,0  restarting  2 player(s)`)
    })
  })

  describe('and it lists the instances of one scene of a world', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { instances: [] }))
      await run(['--world', 'myworld.dcl.eth', '--position=10, 010', '--target', TARGET])
    })

    it('should GET the world scene collection with the normalized parcel', () => {
      expect(request()).toEqual([`${TARGET}/worlds/myworld.dcl.eth/scenes/10,10/instances`, 'GET'])
    })

    it('should report that nothing is running', () => {
      expect(infoMock).toHaveBeenCalledWith('No server instances running for myworld.dcl.eth scene 10,10')
    })
  })

  describe('and it lists the instances of a Genesis City scene', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { instances: [] }))
      await run(['--position=-125,-96', '--target', TARGET])
    })

    it('should GET the scene collection with the comma unescaped', () => {
      expect(request()).toEqual([`${TARGET}/scenes/-125,-96/instances`, 'GET'])
    })

    it('should sign the same path the server verifies', () => {
      expect(signedPayload()).toBe(`get:/scenes/-125,-96/instances:${timestamp()}:{}`)
    })
  })

  describe('and no world or position is passed', () => {
    let sceneJson: { scene: { base: string }; worldConfiguration?: { name: string } }

    beforeEach(() => {
      jest.spyOn(workspaceValidations, 'getValidWorkspace').mockResolvedValue({} as any)
      jest.spyOn(sceneValidations, 'getValidSceneJson').mockImplementation(async () => sceneJson as any)
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { instances: [] }))
    })

    describe('and scene.json names a world', () => {
      beforeEach(async () => {
        sceneJson = { scene: { base: '0,0' }, worldConfiguration: { name: 'MyWorld.dcl.eth' } }
        await run(['--target', TARGET])
      })

      it('should list the instances of that world', () => {
        expect(request()).toEqual([`${TARGET}/worlds/myworld.dcl.eth/instances`, 'GET'])
      })
    })

    describe('and scene.json has no world', () => {
      beforeEach(async () => {
        sceneJson = { scene: { base: '-5,7' } }
        await run(['--target', TARGET])
      })

      it('should list the instances of the Genesis City scene at its base parcel', () => {
        expect(request()).toEqual([`${TARGET}/scenes/-5,7/instances`, 'GET'])
      })
    })
  })

  describe('and it stops one instance of a world', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 204, text: async () => '' })
      await run(['--world', 'myworld.dcl.eth', '--stop', SCENE_ID, '--target', TARGET])
    })

    it('should DELETE the instance', () => {
      expect(request()).toEqual([`${TARGET}/worlds/myworld.dcl.eth/instances/${SCENE_ID}`, 'DELETE'])
    })
  })

  describe('and it stops one instance of a Genesis City scene', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 204, text: async () => '' })
      await run(['--position=1,2', '--stop', SCENE_ID, '--target', TARGET])
    })

    it('should DELETE the instance under the scene', () => {
      expect(request()).toEqual([`${TARGET}/scenes/1,2/instances/${SCENE_ID}`, 'DELETE'])
    })
  })

  describe('and it stops every instance of a scene', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { stopped: [SCENE_ID, 'bafkreiother'] }))
      await run(['--world', 'myworld', '--position=1,2', '--stop-all', '--target', TARGET])
    })

    it('should DELETE the scene collection', () => {
      expect(request()).toEqual([`${TARGET}/worlds/myworld.dcl.eth/scenes/1,2/instances`, 'DELETE'])
    })

    it('should print each stopped instance', () => {
      expect(logMock.mock.calls).toEqual([[`  ${SCENE_ID}`], ['  bafkreiother']])
    })
  })

  describe('and it stops every instance of a world without a position', () => {
    it('should throw without calling the server', async () => {
      await expect(run(['--world', 'myworld', '--stop-all'])).rejects.toMatchObject({
        name: 'SERVER_INSTANCES_MISSING_POSITION'
      })
    })
  })

  describe('and both --stop and --stop-all are passed', () => {
    it('should throw without calling the server', async () => {
      await expect(run(['--world', 'myworld', '--stop', SCENE_ID, '--stop-all'])).rejects.toMatchObject({
        name: 'SERVER_INSTANCES_INVALID_ARGUMENT'
      })
    })
  })

  describe('and the sceneId to stop is malformed', () => {
    it('should throw without calling the server', async () => {
      await expect(run(['--world', 'myworld', '--stop', '../ping'])).rejects.toMatchObject({
        name: 'SERVER_INSTANCES_INVALID_SCENE_ID'
      })
    })
  })

  describe('and the position is malformed', () => {
    it('should throw without calling the server', async () => {
      await expect(run(['--position', '1,2/../x'])).rejects.toMatchObject({
        name: 'SERVER_INSTANCES_INVALID_ARGUMENT'
      })
    })
  })

  describe('and the server answers with an error', () => {
    let status: number
    let error: string

    beforeEach(() => {
      fetchMock.mockImplementationOnce(async () => jsonResponse(status, { error }))
    })

    describe('and the signature is refused', () => {
      beforeEach(() => {
        status = 401
        error = 'Authentication required'
      })

      it('should explain that signatures expire', async () => {
        await expect(run(['--world', 'myworld'])).rejects.toMatchObject({
          name: 'SERVER_INSTANCES_REQUEST_FAILED',
          message: expect.stringMatching(/401: Authentication required \(signatures expire after a minute/)
        })
      })
    })

    describe('and the caller has no rights', () => {
      beforeEach(() => {
        status = 403
        error = 'Not an owner or collaborator'
      })

      it('should throw with the server error', async () => {
        await expect(run(['--world', 'myworld'])).rejects.toMatchObject({
          name: 'SERVER_INSTANCES_REQUEST_FAILED',
          message: 'Server returned 403: Not an owner or collaborator'
        })
      })
    })

    describe('and the instance is not found', () => {
      beforeEach(() => {
        status = 404
        error = 'No instance found'
      })

      it('should throw with the server error', async () => {
        await expect(run(['--world', 'myworld', '--stop', SCENE_ID])).rejects.toMatchObject({
          name: 'SERVER_INSTANCES_REQUEST_FAILED',
          message: 'Server returned 404: No instance found'
        })
      })
    })

    describe('and the permissions lookup is unavailable', () => {
      beforeEach(() => {
        status = 503
        error = 'Permissions unavailable'
      })

      it('should throw with the server error', async () => {
        await expect(run(['--position=1,2'])).rejects.toMatchObject({
          name: 'SERVER_INSTANCES_REQUEST_FAILED',
          message: 'Server returned 503: Permissions unavailable'
        })
      })
    })
  })

  describe('and the server answers 200 with an unexpected body', () => {
    let body: () => Promise<unknown>

    beforeEach(() => {
      fetchMock.mockImplementationOnce(async () => ({ ok: true, status: 200, text: async () => '', json: body }))
    })

    describe('and the body is not JSON', () => {
      beforeEach(() => {
        body = async () => {
          throw new SyntaxError('Unexpected token <')
        }
      })

      it('should throw a request failure', async () => {
        await expect(run(['--world', 'myworld'])).rejects.toMatchObject({ name: 'SERVER_INSTANCES_REQUEST_FAILED' })
      })
    })

    describe('and the body has no instances array', () => {
      beforeEach(() => {
        body = async () => ({ status: 'ok' })
      })

      it('should throw a request failure', async () => {
        await expect(run(['--world', 'myworld'])).rejects.toMatchObject({ name: 'SERVER_INSTANCES_REQUEST_FAILED' })
      })
    })
  })
})
