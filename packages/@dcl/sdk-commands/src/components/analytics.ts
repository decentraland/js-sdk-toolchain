import { v4 as uuidv4 } from 'uuid'
import { Analytics } from '@segment/analytics-node'
import future from 'fp-future'

import { CliComponents } from '.'
import { colors } from './log'
import { getGlobalDclRcPath, readStringConfig, writeGlobalConfig } from './config'
import { getInstalledPackageVersion, getSdkCommandsVersion, getSegmentKey, isCI, isEditor } from '../logic/config'

export type IAnalyticsComponent = {
  track<T extends keyof Events>(eventName: T, eventProps: Events[T]): void
  stop(): Promise<void>
}

export type Events = {
  'Scene created': {
    projectType: string
    url: string
  }
  'Preview started': {
    projectHash: string
    coords: { x: number; y: number }
    isWorkspace: boolean
    isPortableExperience: boolean
  }
  'Build scene': {
    projectHash: string
    coords: { x: number; y: number }
    isWorkspace: boolean
    isPortableExperience: boolean
  }
  'Export static': {
    projectHash: string
    coords: { x: number; y: number }
  }
  'Scene deploy started': {
    projectHash: string
    coords: { x: number; y: number }
    isWorld: boolean
  }
  'Scene deploy success': {
    projectHash: string
    coords: { x: number; y: number }
    isWorld: boolean
    dependencies: string[]
    sceneId: string
    targetContentServer: string
    worldName: string | undefined
    isPortableExperience: boolean
    serverlessMultiplayer: boolean
  }
  'Scene deploy failure': {
    projectHash: string
    coords: { x: number; y: number }
    isWorld: boolean
    error: string
  }
  'Pack smart wearable': {
    projectHash: string
  }
  'Quest Created Success': {
    questId: string
    questName: string
  }
  'Quest Created Failure': {
    code: number
  }
  'Quest Deactivated Success': {
    questId: string
  }
  'Quest Deactivated Failure': {
    code: number
    questId: string
  }
  'Quest Activated Success': {
    questId: string
  }
  'Quest Activated Failure': {
    code: number
    questId: string
  }
  'Quest List Success': {
    creatorAddress: string
  }
  'Quest List Failure': {
    code: number
    creatorAddress: string
  }
}

const noopAnalytics: IAnalyticsComponent = {
  track() {},
  async stop() {}
}

export async function createAnalyticsComponent(components: Pick<CliComponents, 'config' | 'logger' | 'fs'>) {
  const analyticsEnabled = (await readStringConfig(components, 'DCL_DISABLE_ANALYTICS')) !== 'true'

  if (!analyticsEnabled) {
    return noopAnalytics
  }

  const USER_ID = 'sdk-commands-user'
  let anonId = await readStringConfig(components, 'DCL_ANON_ID')

  const analytics: Analytics = new Analytics({ writeKey: getSegmentKey() })

  if (!anonId) {
    anonId = uuidv4()
    await writeGlobalConfig(components, 'DCL_ANON_ID', anonId)

    analytics.identify({
      userId: USER_ID,
      traits: {
        devId: anonId,
        createdAt: new Date()
      }
    })

    components.logger.info(
      [
        `By default, Decentraland CLI sends anonymous usage stats to improve the products, if you want to disable it, add the following line to the configuration file at ${colors.bold(
          getGlobalDclRcPath()
        )}.`,
        `  DCL_DISABLE_ANALYTICS=true`,
        `More info https://dcl.gg/sdk/analytics`
      ].join('\n')
    )
  }

  const promises: Promise<void>[] = []

  const sdkVersion = await getInstalledPackageVersion(components, '@dcl/sdk', process.cwd())

  // the following properties are added to every telemetry report
  const baseTelemetryProperties = {
    os: process.platform,
    nodeVersion: process.version,
    cliVersion: await getSdkCommandsVersion(),
    isCI: isCI(),
    isEditor: isEditor(),
    devId: anonId,
    ecs: {
      ecsVersion: 'ecs7',
      packageVersion: sdkVersion
    }
  }

  function track<T extends keyof Events>(eventName: T, eventProps: Events[T]) {
    const trackFuture = future<void>()

    const trackInfo = {
      userId: USER_ID,
      event: eventName,
      properties: {
        ...eventProps,
        ...baseTelemetryProperties
      }
    }

    analytics.track(trackInfo, () => {
      trackFuture.resolve()
    })

    promises.push(trackFuture)
  }

  return {
    get() {
      return analytics
    },
    track,
    async stop() {
      await Promise.all(promises)
    }
  }
}
