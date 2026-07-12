import { initComponents } from '../../../packages/@dcl/sdk-commands/src/components'
import { runSdkCommand } from '../../../packages/@dcl/sdk-commands/src/run-command'
import { rmSync } from 'fs'

describe('blackbox: init', () => {
  test('init command', async () => {
    const components = await initComponents()

    rmSync('tmp/blackbox-scene', { recursive: true, force: true })
    await components.fs.mkdir('tmp/blackbox-scene', { recursive: true })

    await runSdkCommand(components, 'init', ['--dir=tmp/blackbox-scene'])
    await runSdkCommand(components, 'build', ['--dir=tmp/blackbox-scene', '--customEntryPoint'])
  }, 180000) // Increased timeout: npm install can be slow when running with other tests
})
