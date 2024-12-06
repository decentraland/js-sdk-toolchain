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
    realm,
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
  // Remove (--) from the command
  const extraArgs = args._.map(($) => $.replace(/^-+/, '')).join('&')
  try {
    const params = `realm=${realm}&position=${baseCoords.x},${baseCoords.y}&local-scene=true&debug=true&hub=${isHub}&${extraArgs}`
    const app = `decentraland://"${params}"`
    await components.spawner.exec(cwd, cmd, [app], { silent: true })
    components.logger.info(`Desktop client: decentraland://${params}\n`)
    return true
  } catch (e: any) {
    components.logger.error('Decentraland Desktop Client failed with: ', e.message)
    return false
  }
}
