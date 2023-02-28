import { v4 as uuidv4 } from 'uuid'
import { Analytics } from '@segment/analytics-node'
import future from 'fp-future'

import { CliComponents } from '.'
import { colors } from './log'

export type IAnalyticsComponent = {
  get(): Analytics
  identify(): Promise<void>
  track<T extends keyof Events>(eventName: T, eventProps: Events[T]): Promise<void>
}

type Events = {
  'Scene created': {
    projectType: string
    url: string
  }
  'Preview started': {
    projectHash: string
    coords: { x: number; y: number }
    isWorkspace: boolean
  }
  'Build scene': {
    projectHash: string
    coords: { x: number; y: number }
    isWorkspace: boolean
  }
  'Export static': {
    projectHash: string
    coords: { x: number; y: number }
  }
}

export async function createAnalyticsComponent({
  dclInfoConfig
}: Pick<CliComponents, 'dclInfoConfig'>): Promise<IAnalyticsComponent> {
  const USER_ID = 'sdk-commands-user'
  const config = await dclInfoConfig.get()
  const analytics: Analytics = new Analytics({ writeKey: config.segmentKey ?? '' })
  return {
    get() {
      return analytics
    },
    async identify() {
      if (!config.userId) {
        console.log(
          `Decentraland CLI sends anonymous usage stats to improve their products, if you want to disable it change the configuration at ${colors.bold(
            '~/.dclinfo'
          )}\n`
        )

        const userId = uuidv4()
        await dclInfoConfig.updateDCLInfo({ userId, trackStats: true })
        analytics.identify({
          userId: USER_ID,
          traits: {
            devId: userId,
            createdAt: new Date()
          }
        })
      }
    },
    async track<T extends keyof Events>(eventName: T, eventProps: Events[T]) {
      const trackFuture = future<void>()
      const { userId, trackStats } = await dclInfoConfig.get()
      if (!trackStats) {
        return trackFuture.resolve()
      }
      const trackInfo = {
        userId: USER_ID,
        event: eventName,
        properties: {
          ...eventProps,
          os: process.platform,
          nodeVersion: process.version,
          cliVersion: await dclInfoConfig.getVersion(),
          isCI: dclInfoConfig.isCI(),
          isEditor: dclInfoConfig.isEditor(),
          devId: userId
        }
      }
      analytics.track(trackInfo, () => {
        trackFuture.resolve()
      })
      if (!dclInfoConfig.isProduction()) {
        console.log(trackInfo)
      }
      return trackFuture
    }
  }
}
