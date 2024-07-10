import prompts from 'prompts'
import { CliComponents } from '../../components'
import { writeGlobalConfig } from '../../components/config'

const isWindows = /^win/.test(process.platform)

export async function runExplorerAlpha(components: CliComponents, cwd: string, realm: string) {
  if (await runApp(components, { cwd, realm })) {
    return
  }
  const path = await getExplorerAlphaPath(components)
  if (path && (await runApp(components, { cwd, realm, path }))) {
    return
  }
  components.logger.log('\n')
  components.logger.warn('DECENTRALAND APP NOT FOUND. ')
  components.logger.warn('Please download & install it: https://dcl.gg/explorer\n\n')
}

async function runApp(components: CliComponents, { cwd, realm, path }: { cwd: string; realm: string; path?: string }) {
  const cmd = isWindows ? 'start' : 'open'
  try {
    await components.spawner.exec(cwd, cmd, [path ?? `decentraland://realm=${realm}`], { silent: true })
    if (path) {
      await writeGlobalConfig(components, 'EXPLORER_ALPHA_PATH', path)
    }
    return true
  } catch (e: any) {
    // components.logger.error('failed', e.message)
    return false
  }
}

export async function getExplorerAlphaPath(components: CliComponents): Promise<string | undefined> {
  const path = await components.config.getString('EXPLORER_ALPHA_PATH')
  if (path) return path
  try {
    const answer = await prompts(
      {
        type: 'text',
        name: 'path',
        message: 'Please provide the Directory where the Explorer Client is installed. i.e. /Applications/',
        validate: (description) => description.length >= 5
      },
      {
        onCancel: () => {
          throw new Error('Please provide a path')
        }
      }
    )
    let path: string = answer.path
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
  } catch (e: any) {
    return undefined
  }
}
