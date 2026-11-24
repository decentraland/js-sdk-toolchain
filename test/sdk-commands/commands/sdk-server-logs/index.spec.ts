import { initComponents, CliComponents } from '../../../../packages/@dcl/sdk-commands/src/components'
import { main, args } from '../../../../packages/@dcl/sdk-commands/src/commands/sdk-server-logs'
import { parseArgs } from '../../../../packages/@dcl/sdk-commands/src/logic/args'

const FAKE_PRIVATE_KEY = '0x' + '11'.repeat(32)

describe('when streaming the logs of a world scene', () => {
  let components: CliComponents
  let fetchMock: jest.SpyInstance
  let previousKey: string | undefined
  let headers: Record<string, string>

  beforeEach(async () => {
    previousKey = process.env.DCL_PRIVATE_KEY
    process.env.DCL_PRIVATE_KEY = FAKE_PRIVATE_KEY
    components = await initComponents()
    jest.spyOn(components.logger, 'info').mockImplementation(() => undefined)
    fetchMock = jest.spyOn(components.fetch, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      body: undefined
    } as any)
    await main({
      args: parseArgs(['--world', 'MyWorld', '--position=10,10', '--target', 'https://mp.example'], args),
      components
    })
    headers = fetchMock.mock.calls[0][1].headers
  })

  afterEach(() => {
    process.env.DCL_PRIVATE_KEY = previousKey
    if (previousKey === undefined) delete process.env.DCL_PRIVATE_KEY
    jest.restoreAllMocks()
  })

  it('should send the scene in the signed metadata', () => {
    expect(headers['x-identity-metadata']).toBe(
      '{"parcel":"10,10","realmName":"MyWorld.dcl.eth","sceneId":"MyWorld.dcl.eth"}'
    )
  })

  it('should sign the fully lowercased legacy payload', () => {
    expect(JSON.parse(headers['x-identity-auth-chain-1']).payload).toBe(
      `get:/logs:${headers['x-identity-timestamp']}:{"parcel":"10,10","realmname":"myworld.dcl.eth","sceneid":"myworld.dcl.eth"}`
    )
  })
})
