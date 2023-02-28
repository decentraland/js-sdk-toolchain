import { createAnalyticsComponent } from '../../../packages/@dcl/sdk-commands/src/components/analytics'
import { createFsComponent } from '../../../packages/@dcl/sdk-commands/src/components/fs'
import { createDCLInfoConfigComponent } from '../../../packages/@dcl/sdk-commands/src/components/dcl-info-config'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('Analytics Component', () => {
  it('should create dclinfo file', async () => {
    const fs = createFsComponent()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs })
    jest.spyOn(dclInfoConfig, 'get').mockResolvedValue({ userId: '' })
    const analytics = await createAnalyticsComponent({ dclInfoConfig })

    const updateDclInfoSpy = jest.spyOn(dclInfoConfig, 'updateDCLInfo').mockImplementation()
    await analytics.identify()
    expect(updateDclInfoSpy).toBeCalledTimes(1)
  })

  it('should not track if trackStats is false', async () => {
    const fs = createFsComponent()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs })
    jest.spyOn(dclInfoConfig, 'get').mockResolvedValue({ trackStats: false })
    const analytics = await createAnalyticsComponent({ dclInfoConfig })
    const trackSpy = jest.spyOn(analytics.get(), 'track')
    await analytics.track('Scene created', { projectType: '', url: '' })
    expect(trackSpy).toBeCalledTimes(0)
  })

  it('should track event', async () => {
    const fs = createFsComponent()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs })
    jest.spyOn(dclInfoConfig, 'get').mockResolvedValue({ userId: 'boedo', trackStats: true })
    const analytics = await createAnalyticsComponent({ dclInfoConfig })
    const trackSpy = jest.spyOn(analytics.get(), 'track')
    await analytics.track('Scene created', { projectType: '', url: '' })
    expect(trackSpy).toBeCalledWith(
      {
        userId: 'sdk-commands-user',
        event: 'Scene created',
        properties: {
          projectType: '',
          url: '',
          os: process.platform,
          nodeVersion: process.version,
          cliVersion: await dclInfoConfig.getVersion(),
          isCI: dclInfoConfig.isCI(),
          isEditor: dclInfoConfig.isEditor(),
          devId: 'boedo',
          ecs: {
            ecsVersion: 'ecs7',
            packageVersion: 'unknown'
          }
        }
      },
      expect.anything()
    )
  })
})
