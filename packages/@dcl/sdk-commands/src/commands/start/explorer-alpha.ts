import { CliComponents } from '../../components'
import { writeGlobalConfig } from '../../components/config'

const isWindows = /^win/.test(process.platform)

export async function runExplorerAlpha(
  components: CliComponents,
  opts: { cwd: string; realm: string; path?: string; baseCoords: { x: number; y: number } }
) {
  const { cwd, realm, baseCoords } = opts
  if (await runApp(components, { cwd, realm, baseCoords })) {
    return
  }
  // const explorerPath = await getExplorerAlphaPath(components, path)
  // if (explorerPath && (await runApp(components, { cwd, realm, path: explorerPath, baseCoords }))) {
  //   return
  // }
  components.logger.log('\n')
  components.logger.warn('DECENTRALAND APP NOT FOUND. ')
  components.logger.warn('Please download & install it: https://dcl.gg/explorer\n\n')
}

async function runApp(
  components: CliComponents,
  { cwd, realm, path, baseCoords }: { cwd: string; realm: string; path?: string; baseCoords: { x: number; y: number } }
) {
  const cmd = isWindows ? 'start' : 'open'
  try {
    const app = path ?? `decentraland://realm=${realm}&position=${baseCoords.x},${baseCoords.y}`
    components.logger.log(`Running: ${app}`)
    await components.spawner.exec(cwd, cmd, [app], { silent: true })
    if (path) {
      await writeGlobalConfig(components, 'EXPLORER_ALPHA_PATH', path)
    }
    return true
  } catch (e: any) {
    components.logger.error('Explorer app failed with: ', e)
    return false
  }
}

export async function getExplorerAlphaPath(components: CliComponents, argPath?: string): Promise<string | undefined> {
  if (!argPath) {
    return await components.config.getString('EXPLORER_ALPHA_PATH')
  }

  let path = argPath

  if (isWindows) {
    path += '/Explorer.exe'
  } else {
    if (!path.includes('Decentraland.app')) {
      path = path + '/Decentraland.app'
    }
    const MAC_PATH = '/Contents/MacOS/Explorer'
    if (!path.includes(MAC_PATH)) {
      path = path + MAC_PATH
    }
    return path.replace(/\/\//, '/')
  }
  return path
}
