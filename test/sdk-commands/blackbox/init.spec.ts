import { initComponents } from '../../../packages/@dcl/sdk-commands/src/components'
import { runSdkCommand } from '../../../packages/@dcl/sdk-commands/src/run-command'
import rimraf from 'rimraf'

describe('blackbox: init', () => {
  test('init command', async () => {
    const components = await initComponents()

    rimraf.sync('tmp/blackbox-scene')
    await components.fs.mkdir('tmp/blackbox-scene', { recursive: true })

    await runSdkCommand(components, 'init', ['--dir=tmp/blackbox-scene'])
    await runSdkCommand(components, 'build', ['--dir=tmp/blackbox-scene', '--customEntryPoint'])
  }, 60000)
})
