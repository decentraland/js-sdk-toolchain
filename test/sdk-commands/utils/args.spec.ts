import { initComponents } from '../../../packages/@dcl/sdk-commands/src/components'
import { runSdkCommand } from '../../../packages/@dcl/sdk-commands/src/run-command'

test('invalid argument', async () => {
  const components = await initComponents()
  await expect(runSdkCommand(components, 'export-static', ['--invalid-argument'])).rejects.toThrow('assssssss')
})
