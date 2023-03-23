import { createAnalyticsComponent } from '../../../packages/@dcl/sdk-commands/src/components/analytics'
import { createFsComponent } from '../../../packages/@dcl/sdk-commands/src/components/fs'
import { createDCLInfoConfigComponent } from '../../../packages/@dcl/sdk-commands/src/components/dcl-info-config'
import * as config from '../../../packages/@dcl/sdk-commands/src/logic/config'
import { createStderrCliLogger } from '../../../packages/@dcl/sdk-commands/src/components/log'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('Analytics Component', () => {
  it('should create dclinfo file', async () => {
    const fs = createFsComponent()
    const logger = createStderrCliLogger()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs })
    jest.spyOn(dclInfoConfig, 'get').mockResolvedValue({ userId: undefined })
    const analytics = await createAnalyticsComponent({ dclInfoConfig, logger })

    const updateDclInfoSpy = jest.spyOn(dclInfoConfig, 'updateDCLInfo').mockImplementation()
    await analytics.identify()
    expect(updateDclInfoSpy).toBeCalledWith({
      userId: expect.stringMatching('-'),
      trackStats: true,
      userIdentified: true
    })
  })

  it('should not track if trackStats is false', async () => {
    const fs = createFsComponent()
    const logger = createStderrCliLogger()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs })
    jest.spyOn(dclInfoConfig, 'get').mockResolvedValue({ trackStats: false })
    const analytics = await createAnalyticsComponent({ dclInfoConfig, logger })
    const trackSpy = jest.spyOn(analytics.get(), 'track')
    await analytics.track('Scene created', { projectType: '', url: '', args: {} })
    expect(trackSpy).toBeCalledTimes(0)
  })

  it('should track event', async () => {
    const fs = createFsComponent()
    const logger = createStderrCliLogger()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs })
    jest.spyOn(dclInfoConfig, 'get').mockResolvedValue({ userId: 'boedo', trackStats: true })
    const analytics = await createAnalyticsComponent({ dclInfoConfig, logger })
    const trackSpy = jest.spyOn(analytics.get(), 'track')
    await analytics.track('Scene created', { projectType: '', url: '', args: {} })
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
          },
          args: {}
        }
      },
      expect.anything()
    )
  })
  it('should not call identify if it has been identified.', async () => {
    const fs = createFsComponent()
    const logger = createStderrCliLogger()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs })
    jest.spyOn(dclInfoConfig, 'get').mockResolvedValue({ userId: 'boedo', trackStats: true, userIdentified: true })
    const analytics = await createAnalyticsComponent({ dclInfoConfig, logger })
    const spyIdentify = jest.spyOn(analytics.get(), 'identify')
    await analytics.identify()
    expect(spyIdentify).not.toBeCalled()
  })

  it('should not call identify if trackStats is false', async () => {
    const fs = createFsComponent()
    const logger = createStderrCliLogger()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs })
    jest.spyOn(dclInfoConfig, 'get').mockResolvedValue({ userId: 'boedo', trackStats: false })
    const analytics = await createAnalyticsComponent({ dclInfoConfig, logger })
    const spyIdentify = jest.spyOn(analytics.get(), 'identify')
    await analytics.identify()
    expect(spyIdentify).not.toBeCalled()
  })

  it('should wait for promises to finished', async () => {
    const fs = createFsComponent()
    const logger = createStderrCliLogger()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs })
    jest.spyOn(dclInfoConfig, 'get').mockResolvedValue({ userId: 'boedo', trackStats: true, userIdentified: true })
    const analytics = await createAnalyticsComponent({ dclInfoConfig, logger })
    const spyTrack = jest.spyOn(analytics.get(), 'track')
    analytics.trackSync('Build scene', {} as any)
    await analytics.stop()
    expect(spyTrack).toBeCalled()
  })

  it('should not track if trackstats is defined in the env var', async () => {
    const oldEnv = process.env
    globalThis.process.env = {
      ...oldEnv,
      TRACK_STATS: 'false'
    }
    const fs = createFsComponent()
    const logger = createStderrCliLogger()
    const dclInfoConfig = await createDCLInfoConfigComponent({ fs })
    jest.spyOn(config, 'getDCLInfoConfig').mockResolvedValue({ userId: 'boedo' })
    const analytics = await createAnalyticsComponent({ dclInfoConfig, logger })
    const spyTrack = jest.spyOn(analytics.get(), 'track')
    await analytics.track('Build scene', {} as any)
    expect(spyTrack).not.toBeCalled()
  })
})
