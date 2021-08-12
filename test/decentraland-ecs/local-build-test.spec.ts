import { resolve } from 'path'
import { runCommand, itExecutes, ensureFileExists } from '../../scripts/helpers'

describe('setup local build of decentraland-ecs package', async () => {
  const workingDir = resolve(__dirname, '..', '..')
  const generatedEcsTgzName = 'local-decentraland-ecs.tgz'
  const generatedEcsTgzPath = resolve(workingDir, 'packages', 'decentraland-ecs', generatedEcsTgzName)

  await runCommand('make prepare-pr', workingDir)

  describe('install generated package', () => {
    expect(ensureFileExists(generatedEcsTgzPath)).toBe(true)

    const testPackagePath = resolve(__dirname, `ecs-test-scene-${new Date().getTime()}`)
    const testCommands = [
      'mkdir',
      testPackagePath,
      '&&',
      'cd',
      testPackagePath,
      '&&',
      'cp',
      generatedEcsTgzPath,
      './',
      '&&',
      'tar -xvf',
      generatedEcsTgzName,
      '&&',
      'npm init --yes && npm install ./package &&',
      'cd .. && rm -r',
      testPackagePath
    ]
    itExecutes(testCommands.join(' '), workingDir)
  })
})
