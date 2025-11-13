import { Result } from 'arg'
import { args as startArgs } from '.'
import { CliComponents } from '../../components'

const isWindows = /^win/.test(process.platform)

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

async function checkProtocolHandlerWindows(components: CliComponents, cwd: string): Promise<boolean> {
  try {
    components.logger.log('[DEBUG] Checking if decentraland:// protocol handler is registered on Windows\n')
    // Query the Windows registry to check if the decentraland protocol is registered
    const regQuery = 'reg query HKEY_CLASSES_ROOT\\decentraland /ve'
    components.logger.log(`[DEBUG] Running registry check: ${regQuery}\n`)
    await components.spawner.exec(cwd, 'reg', ['query', 'HKEY_CLASSES_ROOT\\decentraland', '/ve'], { silent: true })
    components.logger.log('[DEBUG] Protocol handler is registered\n')
    return true
  } catch (e: any) {
    components.logger.log('[DEBUG] Protocol handler is NOT registered\n')
    return false
  }
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
  const dclenv = args['--dclenv'] ?? 'org'
  const skipAuthScreen = !!args['--skip-auth-screen']
  const landscapeTerrainEnabled = !!args['--landscape-terrain-enabled']
  const openDeeplinkInNewInstance = !!args['-n']

  try {
    // On Windows, pre-check if the protocol handler is registered
    if (isWindows) {
      const isRegistered = await checkProtocolHandlerWindows(components, cwd)
      if (!isRegistered) {
        throw new Error('Protocol handler not registered. Please install the Decentraland Desktop Client.')
      }
    }

    const params = new URLSearchParams()

    params.set('realm', realm)
    params.set('position', position)
    params.set('dclenv', dclenv)

    params.set('local-scene', 'true')

    if (isHub) {
      params.set('hub', 'true')
    }
    if (skipAuthScreen) {
      params.set('skip-auth-screen', 'true')
    }
    if (landscapeTerrainEnabled) {
      params.set('landscape-terrain-enabled', 'true')
    }
    if (openDeeplinkInNewInstance) {
      params.set('open-deeplink-in-new-instance', 'true')
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
