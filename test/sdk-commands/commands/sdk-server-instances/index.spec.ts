import { initComponents, CliComponents } from '../../../../packages/@dcl/sdk-commands/src/components'
import { main, args } from '../../../../packages/@dcl/sdk-commands/src/commands/sdk-server-instances'
import { parseArgs } from '../../../../packages/@dcl/sdk-commands/src/logic/args'

const FAKE_PRIVATE_KEY = '0x' + '11'.repeat(32)
const SCENE_ID = 'bafkreiexample'

function jsonResponse(status: number, body: unknown): any {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body), json: async () => body }
}

describe('sdk-server-instances', () => {
  let components: CliComponents
  let fetchMock: jest.SpyInstance
  let logMock: jest.SpyInstance
  let previousKey: string | undefined

  beforeEach(async () => {
    previousKey = process.env.DCL_PRIVATE_KEY
    process.env.DCL_PRIVATE_KEY = FAKE_PRIVATE_KEY
    components = await initComponents()
    fetchMock = jest.spyOn(components.fetch, 'fetch')
    logMock = jest.spyOn(components.logger, 'log').mockImplementation(() => undefined)
    jest.spyOn(components.logger, 'info').mockImplementation(() => undefined)
  })

  afterEach(() => {
    process.env.DCL_PRIVATE_KEY = previousKey
    if (previousKey === undefined) delete process.env.DCL_PRIVATE_KEY
    jest.restoreAllMocks()
  })

  function run(argv: string[]) {
    return main({ args: parseArgs(argv, args), components })
  }

  function signedPayload(): string {
    const [, init] = fetchMock.mock.calls[0]
    const link = JSON.parse(init.headers['x-identity-auth-chain-1'])
    return link.payload
  }

  describe('when listing the instances of a world', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { instances: [{ sceneId: SCENE_ID, baseParcel: '0,0', participants: 2 }] })
      )
      await run(['--world', 'MyWorld', '--target', 'https://mp.example/'])
    })

    it('should GET the world instances collection', () => {
      expect(fetchMock.mock.calls[0].slice(0, 1).concat(fetchMock.mock.calls[0][1].method)).toEqual([
        'https://mp.example/worlds/myworld.dcl.eth/instances',
        'GET'
      ])
    })

    it('should sign the lowercased method and path with the metadata verbatim', () => {
      const timestamp = fetchMock.mock.calls[0][1].headers['x-identity-timestamp']
      expect(signedPayload()).toBe(`get:/worlds/myworld.dcl.eth/instances:${timestamp}:{}`)
    })

    it('should print each instance', () => {
      expect(logMock).toHaveBeenCalledWith(expect.stringContaining(SCENE_ID))
    })
  })

  describe('when stopping an instance', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 204, text: async () => '' })
      await run(['--world', 'myworld.dcl.eth', '--stop', SCENE_ID, '--target', 'https://mp.example'])
    })

    it('should DELETE the instance', () => {
      expect([fetchMock.mock.calls[0][0], fetchMock.mock.calls[0][1].method]).toEqual([
        `https://mp.example/worlds/myworld.dcl.eth/instances/${SCENE_ID}`,
        'DELETE'
      ])
    })
  })

  describe('when the sceneId to stop is malformed', () => {
    it('should throw without calling the server', async () => {
      await expect(run(['--world', 'myworld', '--stop', '../ping'])).rejects.toMatchObject({
        name: 'SERVER_INSTANCES_INVALID_SCENE_ID'
      })
    })
  })

  describe('when the server refuses the caller', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: 'Not an owner or collaborator' }))
    })

    it('should throw with the server error', async () => {
      await expect(run(['--world', 'myworld'])).rejects.toMatchObject({
        name: 'SERVER_INSTANCES_REQUEST_FAILED',
        message: expect.stringContaining('403: Not an owner or collaborator')
      })
    })
  })
})
