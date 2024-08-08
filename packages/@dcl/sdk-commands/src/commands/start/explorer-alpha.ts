import { CliComponents } from '../../components'

const isWindows = /^win/.test(process.platform)

export async function runExplorerAlpha(
  components: CliComponents,
  opts: { cwd: string; realm: string; baseCoords: { x: number; y: number } }
) {
  const { cwd, realm, baseCoords } = opts

  if (await runApp(components, { cwd, realm, baseCoords })) {
    return
  }

  components.logger.log('Please download & install the Decentraland Desktop Client: https://dcl.gg/explorer\n\n')
}

async function runApp(
  components: CliComponents,
  { cwd, realm, baseCoords }: { cwd: string; realm: string; baseCoords: { x: number; y: number } }
) {
  const cmd = isWindows ? 'start' : 'open'
  try {
    const params = `realm=${realm}&position=${baseCoords.x},${baseCoords.y}&local-scene=true`
    const app = `decentraland://"${params}"`
    await components.spawner.exec(cwd, cmd, [app], { silent: true })
    components.logger.info(`Desktop client: decentraland://${params}\n`)
    return true
  } catch (e: any) {
    components.logger.error('Decentraland Desktop Client failed with: ', e.message)
    return false
  }
}
