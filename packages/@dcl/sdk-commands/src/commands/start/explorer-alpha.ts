import prompts from 'prompts'
import { CliComponents } from '../../components'
import { writeGlobalConfig } from '../../components/config'

export async function runExplorerAlpha(components: CliComponents, cwd: string) {
  if (await runApp(components, cwd)) {
    return
  }
  const path = await getExplorerAlphaPath(components)
  if (path && (await runApp(components, cwd, path))) {
    return
  }
  components.logger.log('\n')
  components.logger.warn('EXPLORER APP NOT FOUND. ')
  components.logger.warn('Please download & install it: https://dcl.gg/explorer\n\n')
}

async function runApp(components: CliComponents, cwd: string, path?: string) {
  const cmd = isWindows ? 'start' : 'open'
  try {
    //'--realm http://127.0.0.1:8000'
    await components.spawner.exec(cwd, cmd, [path ?? 'decentraland://'], { silent: true })
    if (path) {
      await writeGlobalConfig(components, 'EXPLORER_ALPHA_PATH_2', path)
    }
    return true
  } catch (e: any) {
    // components.logger.error('failed', e.message)
    return false
  }
}

const isWindows = /^win/.test(process.platform)

export async function getExplorerAlphaPath(components: CliComponents): Promise<string | undefined> {
  const path = await components.config.getString('EXPLORER_ALPHA_PATH_2')
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
