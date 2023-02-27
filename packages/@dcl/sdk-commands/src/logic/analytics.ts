import { v4 as uuidv4 } from 'uuid'
import { Analytics } from '@segment/analytics-node'
import { getConfig, getInstalledSDKVersion, isCI, isEditor, writeDCLInfo } from './config'
import future from 'fp-future'
import { colors } from '../components/log'

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

export async function track<T extends keyof Events>(eventName: T, eventProps: Events[T]) {
  const trackFuture = future<void>()
  const { userId, trackStats } = await getConfig()
  if (!trackStats) return
  analytics.track(
    {
      userId: USER_ID,
      event: eventName,
      properties: {
        ...eventProps,
        os: process.platform,
        nodeVersion: process.version,
        cliVersion: await getInstalledSDKVersion(),
        isCI: isCI(),
        isEditor: isEditor(),
        devId: userId
      }
    },
    () => {
      trackFuture.resolve()
    }
  )
  return trackFuture
}

export async function identifyAnalytics() {
  const config = await getConfig()
  if (!config.segmentKey) return
  analytics = new Analytics({ writeKey: config.segmentKey })
  if (!config.userId) {
    console.log(
      `Decentraland CLI sends anonymous usage stats to improve their products, if you want to disable it change the configuration at ${colors.bold(
        '~/.dclinfo'
      )}\n`
    )

    const userId = uuidv4()
    await writeDCLInfo({ userId, trackStats: true })
    analytics.identify({
      userId: USER_ID,
      traits: {
        devId: userId
      }
    })
  }
}
