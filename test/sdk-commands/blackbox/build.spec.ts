import { initComponents } from '../../../packages/@dcl/sdk-commands/src/components'
import { runSdkCommand } from '../../../packages/@dcl/sdk-commands/src/run-command'

describe('blackbox: build', () => {
  test('build integration test with workspace', async () => {
    const components = await initComponents()
    await runSdkCommand(components, 'build', ['--dir=test/build-ecs/fixtures'])
  })

  test('build integration test with single scene', async () => {
    const components = await initComponents()
    await runSdkCommand(components, 'build', ['--dir=test/build-ecs/fixtures/ecs7-scene', '--skip-install'])
  }, 15000)

  test('build integration test with --single file', async () => {
    const components = await initComponents()
    await runSdkCommand(components, 'build', [
      '--dir=test/snapshots',
      '--single=development-bundles/testing-fw.test.ts'
    ])
  }, 15000)

  test('build integration test with --single file --production', async () => {
    const components = await initComponents()
    await runSdkCommand(components, 'build', [
      '--dir=test/snapshots',
      '--production',
      '--single=development-bundles/testing-fw.test.ts'
    ])
  }, 15000)

  test('build integration test with --single wildcard', async () => {
    const components = await initComponents()
    await runSdkCommand(components, 'build', ['--dir=test/snapshots', '--single=development-bundles/*.test.ts'])
  }, 15000)
})
