import { isCI, getSdkCommandsVersion, getCatalystBaseUrl } from '../../../packages/@dcl/sdk-commands/src/logic/config'
import { createRecordConfigComponent } from '../../../packages/@dcl/sdk-commands/node_modules/@well-known-components/env-config-provider/dist'
import { requireStringConfig } from '../../../packages/@dcl/sdk-commands/src/components/config'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('Config component should work', () => {
  it('Get sdk version', async () => {
    expect(await getSdkCommandsVersion()).toBe('7.0.0')
  })

  it('requireStringConfig fails in case of missing key', async () => {
    const config = createRecordConfigComponent({})
    await expect(() => requireStringConfig({ config }, 'DCL_ANON_ID')).rejects.toThrow()
  })

  it('custom catalyst url', async () => {
    const config = createRecordConfigComponent({
      DCL_CATALYST: 'https://test.com/a/b/c'
    })
    expect((await getCatalystBaseUrl({ config })).toString()).toBe('https://test.com/a/b/c')
  })

  it('custom catalyst url, tailing/', async () => {
    const config = createRecordConfigComponent({
      DCL_CATALYST: 'https://test.com/a/b/c/'
    })
    expect((await getCatalystBaseUrl({ config })).toString()).toBe('https://test.com/a/b/c')
  })

  it('custom catalyst url, not provided', async () => {
    const config = createRecordConfigComponent({})
    expect((await getCatalystBaseUrl({ config })).toString()).toBe('https://peer.decentraland.org')
  })

  it('get isCI', async () => {
    const originalEnv = process.env
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      DEVELOPER_MODE: '',
      CI: 'false'
    }

    expect(isCI()).toBe(false)
    process.env = {
      ...originalEnv,
      CI: 'true'
    }
    expect(isCI()).toBe(true)
    process.env = originalEnv
  })
})
