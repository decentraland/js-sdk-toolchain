import { v4 as uuidv4 } from 'uuid'
import { Analytics } from '@segment/analytics-node'
import future from 'fp-future'

import { isDevelopment, getConfig, getInstalledSDKVersion, isCI, isEditor, writeDCLInfo } from './config'
import { colors } from '../components/log'
import { CliComponents } from '../components'

let analytics: Analytics
const USER_ID = 'sdk-commands-user'

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
}

export async function track<T extends keyof Events>(
  components: Pick<CliComponents, 'fs'>,
  eventName: T,
  eventProps: Events[T]
) {
  const trackFuture = future<void>()
  const { userId, trackStats } = await getConfig(components)
  if (!trackStats) return
  const trackInfo = {
    userId: USER_ID,
    event: eventName,
    properties: {
      ...eventProps,
      os: process.platform,
      nodeVersion: process.version,
      cliVersion: await getInstalledSDKVersion(components),
      isCI: isCI(),
      isEditor: isEditor(),
      devId: userId
    }
  }
  analytics.track(trackInfo, () => {
    trackFuture.resolve()
  })
  if (isDevelopment()) {
    console.log(trackInfo)
  }
  return trackFuture
}

export async function identifyAnalytics(components: Pick<CliComponents, 'fs'>) {
  const config = await getConfig(components)
  if (!config.segmentKey) return
  analytics = new Analytics({ writeKey: config.segmentKey })
  if (!config.userId) {
    console.log(
      `Decentraland CLI sends anonymous usage stats to improve their products, if you want to disable it change the configuration at ${colors.bold(
        '~/.dclinfo'
      )}\n`
    )

    const userId = uuidv4()
    await writeDCLInfo(components, { userId, trackStats: true })
    analytics.identify({
      userId: USER_ID,
      traits: {
        devId: userId
      }
    })
  }
}
