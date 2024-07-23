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

  components.logger.log('Please download & install the Decentraland Desktop Client: https://dcl.gg/explorer\n\n')
}

async function runApp(
  components: CliComponents,
  { cwd, realm, path, baseCoords }: { cwd: string; realm: string; path?: string; baseCoords: { x: number; y: number } }
) {
  const cmd = isWindows ? 'start' : 'open'
  try {
    const params = `realm=${realm}&position=${baseCoords.x},${baseCoords.y}`
    const app = path ?? `decentraland://"${params}"`

    await components.spawner.exec(cwd, cmd, [app], { silent: true })
    if (path) {
      await writeGlobalConfig(components, 'EXPLORER_ALPHA_PATH', path)
    }
    components.logger.info(`Desktop client: decentraland://${params}\n`)
    return true
  } catch (e: any) {
    components.logger.error('Decentraland Desktop Client failed with: ', e.message)
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
