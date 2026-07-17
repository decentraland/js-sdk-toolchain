import { Result } from 'arg'
import { args as startArgs } from '.'
import { CliComponents } from '../../components'

const isWindows = /^win/.test(process.platform)

/**
 * Parses raw CLI tokens (everything after a standalone `--`) into deep link query params.
 * Supports `--key=value`, `--key value` and bare `--key` (mapped to `key=true`).
 * Tokens that are not flags and not consumed as a value are ignored.
 */
export function parsePassthroughParams(tokens: string[]): Map<string, string> {
  const params = new Map<string, string>()
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (!token.startsWith('-')) continue
    const stripped = token.replace(/^-+/, '')
    if (!stripped) continue
    const eqIndex = stripped.indexOf('=')
    if (eqIndex > 0) {
      params.set(stripped.slice(0, eqIndex), stripped.slice(eqIndex + 1))
    } else if (eqIndex === -1 && i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
      params.set(stripped, tokens[i + 1])
      i++
    } else if (eqIndex === -1) {
      params.set(stripped, 'true')
    }
  }
  return params
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
  const dclenv = args['--dclenv'] ?? 'org'
  const skipAuthScreen = !!args['--skip-auth-screen']
  const landscapeTerrainEnabled = !!args['--landscape-terrain-enabled']
  const openDeeplinkInNewInstance = !!args['-n']
  const multiInstance = !!args['--multi-instance']
  const mcp = !!args['--mcp']
  const mcpPort = args['--mcp-port']

  try {
    if (isWindows) {
      // On Windows, pre-check if the protocol handler is registered as `start` will silently fail otherwise.
      // This command will throw an error if the protocol is not registered, that is catched below.
      await components.spawner.exec(cwd, 'reg', ['query', 'HKEY_CLASSES_ROOT\\decentraland', '/ve'], { silent: true })
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
    if (multiInstance) {
      params.set('multi-instance', 'true')
    }
    if (mcp) {
      params.set('mcp', 'true')
    }
    if (mcpPort !== undefined) {
      params.set('mcp-port', String(mcpPort))
    }

    // Forward any params placed after a standalone `--` verbatim into the deep link.
    // Applied last so they can override the defaults above, same as the declared flags do.
    for (const [key, value] of parsePassthroughParams(args._ ?? [])) {
      params.set(key, value)
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
