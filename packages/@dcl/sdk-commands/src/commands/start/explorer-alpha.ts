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
  const localScene = args['--local-scene'] ?? true
  const debug = args['--debug'] ?? true
  const dclenv = args['--dclenv'] ?? 'org'
  const skipAuthScreen = args['--skip-auth-screen'] ?? true
  const landscapeTerrainEnabled = args['--landscape-terrain-enabled'] ?? true

  try {
    const queryParams = [
      `realm=${realm}`,
      `position=${position}`,
      `local-scene=${localScene}`,
      `debug=${debug}`,
      `hub=${isHub}`,
      `dclenv=${dclenv}`,
      `skip-auth-screen=${skipAuthScreen}`,
      `landscape-terrain-enabled=${landscapeTerrainEnabled}`
    ].join('&')

    const app = `decentraland://"${queryParams}"`
    await components.spawner.exec(cwd, cmd, [app], { silent: true })
    components.logger.info(`Desktop client: decentraland://${queryParams}\n`)
    return true
  } catch (e: any) {
    components.logger.error('Decentraland Desktop Client failed with: ', e.message)
    return false
  }
}
