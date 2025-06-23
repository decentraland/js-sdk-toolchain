import { Result } from 'arg'
import { args as startArgs } from '.'
import { CliComponents } from '../../components'

const isWindows = /^win/.test(process.platform)

// Helper function to convert string to boolean
function stringToBoolean(value: string | undefined, defaultValue: boolean = true): boolean {
  if (!value) return defaultValue
  return value.toLowerCase() === 'true'
}

export async function runExplorerAlpha(
  components: CliComponents,
  opts: {
    cwd: string
    realm: string
    baseCoords: { x: number; y: number }
    isHub: boolean
    args: Result<typeof startArgs>
  }
) {
  const { cwd, realm, baseCoords, isHub } = opts

  if (await runApp(components, { cwd, realm, baseCoords, isHub, args: opts.args })) {
    return
  }

  components.logger.log('Please download & install the Decentraland Desktop Client: https://dcl.gg/explorer\n\n')
}

async function runApp(
  components: CliComponents,
  {
    cwd,
    realm: realmValue,
    baseCoords,
    isHub,
    args
  }: {
    cwd: string
    realm: string
    baseCoords: { x: number; y: number }
    isHub: boolean
    args: Result<typeof startArgs>
  }
) {
  const cmd = isWindows ? 'start' : 'open'
  const position = args['--position'] ?? `${baseCoords.x},${baseCoords.y}`
  const realm = args['--realm'] ?? realmValue
  const localScene = stringToBoolean(args['--local-scene'], true)
  const debug = stringToBoolean(args['--debug'], true)
  const dclenv = args['--dclenv'] ?? 'org'
  const skipAuthScreen = stringToBoolean(args['--skip-auth-screen'], true)
  const landscapeTerrainEnabled = stringToBoolean(args['--landscape-terrain-enabled'], true)
  const openDeeplinkInNewInstance = args['-n']

  try {
    const params = new URLSearchParams()

    params.set('realm', realm)
    params.set('position', position)
    params.set('local-scene', localScene.toString())
    params.set('debug', debug.toString())
    params.set('hub', isHub.toString())
    params.set('dclenv', dclenv)
    params.set('skip-auth-screen', skipAuthScreen.toString())
    params.set('landscape-terrain-enabled', landscapeTerrainEnabled.toString())

    if (openDeeplinkInNewInstance) {
      params.set('open-deeplink-in-new-instance', openDeeplinkInNewInstance.toString())
    }

    const queryParams = params.toString()

    const app = `decentraland://"${queryParams}"`
    await components.spawner.exec(cwd, cmd, [app], { silent: true })
    components.logger.info(`Desktop client: decentraland://${queryParams}\n`)
    return true
  } catch (e: any) {
    components.logger.error('Decentraland Desktop Client failed with: ', e.message)
    return false
  }
}
