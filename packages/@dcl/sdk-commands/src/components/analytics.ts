import { v4 as uuidv4 } from 'uuid'
import { Analytics } from '@segment/analytics-node'
import future from 'fp-future'

import { CliComponents } from '.'
import { colors } from './log'
import { DCLInfo } from '../logic/dcl-info'

export type IAnalyticsComponent = {
  get(): Analytics
  identify(): Promise<void>
  track<T extends keyof Events>(eventName: T, eventProps: Events[T]): Promise<void>
  trackSync<T extends keyof Events>(eventName: T, eventProps: Events[T]): void
  stop(): Promise<void>
}

export type Events = {
  'Scene created': {
    projectType: string
    url: string
    args: Record<string, unknown>
  }
  'Preview started': {
    projectHash: string
    coords: { x: number; y: number }
    isWorkspace: boolean
    args: Record<string, unknown>
  }
  'Build scene': {
    projectHash: string
    coords: { x: number; y: number }
    isWorkspace: boolean
    args: Record<string, unknown>
  }
  'Export static': {
    projectHash: string
    coords: { x: number; y: number }
    args: Record<string, unknown>
  }
  'Scene deploy started': {
    projectHash: string
    coords: { x: number; y: number }
    isWorld: boolean
    args: Record<string, unknown>
  }
  'Scene deploy success': {
    projectHash: string
    coords: { x: number; y: number }
    isWorld: boolean
    args: Record<string, unknown>
    dependencies: string[]
  }
  'Scene deploy failure': {
    projectHash: string
    coords: { x: number; y: number }
    isWorld: boolean
    args: Record<string, unknown>
    error: string
  }
}

export async function createAnalyticsComponent({
  dclInfoConfig
}: Pick<CliComponents, 'dclInfoConfig'>): Promise<IAnalyticsComponent> {
  const USER_ID = 'sdk-commands-user'
  const config = await dclInfoConfig.get()
  const analytics: Analytics = new Analytics({ writeKey: config.segmentKey ?? '' })
  const promises: Promise<void>[] = []

  async function track<T extends keyof Events>(eventName: T, eventProps: Events[T]) {
    const trackFuture = future<void>()
    const { userId, trackStats } = await dclInfoConfig.get()
    const version = await dclInfoConfig.getVersion()
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
        cliVersion: version,
        isCI: dclInfoConfig.isCI(),
        isEditor: dclInfoConfig.isEditor(),
        devId: userId,
        ecs: {
          ecsVersion: 'ecs7',
          packageVersion: version
        }
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
  return {
    get() {
      return analytics
    },
    async identify() {
      if (config.userId && !config.trackStats) {
        return
      }
      const userId = config.userId ?? uuidv4()
      let dclInfo: DCLInfo = {}
      if (!config.userId) {
        dclInfo = { userId, trackStats: true }
        console.log(
          `Decentraland CLI sends anonymous usage stats to improve their products, if you want to disable it change the configuration at ${colors.bold(
            '~/.dclinfo'
          )}\n`
        )
      }
      if (!config.userIdentified) {
        dclInfo.userIdentified = true
        analytics.identify({
          userId: USER_ID,
          traits: {
            devId: userId,
            createdAt: new Date()
          }
        })
      }
      if (Object.keys(dclInfo).length) {
        await dclInfoConfig.updateDCLInfo(dclInfo)
      }
    },
    trackSync(eventName, eventProps) {
      promises.push(track(eventName, eventProps))
    },
    track,
    async stop() {
      await Promise.all(promises)
    }
  }
}
