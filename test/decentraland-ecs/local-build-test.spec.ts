import { resolve } from 'path'
import { readFileSync } from 'fs'
import { itExecutes, ensureFileExists, itDeletesFolder } from '../../scripts/helpers'

describe('setup local build of decentraland-ecs package', () => {
  const workingDir = resolve(__dirname, '..', '..')
  const generatedEcsTgzName = 'decentraland-ecs-0.0.0.tgz'
  const generatedEcsTgzPath = resolve(workingDir, 'packages', 'decentraland-ecs', generatedEcsTgzName)

  itExecutes('make prepare-pr', workingDir)

  it('ensure files exist', () => {
    ensureFileExists(generatedEcsTgzPath)
  })

  describe('install generated package', () => {
    const testPackagePath = resolve(__dirname, `ecs-test-scene-${new Date().getTime()}`)
    const testCommands = [
        'mkdir',testPackagePath, '&&',
        'cd', testPackagePath, '&&',
        'cp',generatedEcsTgzPath,'./', '&&',
        'tar -xvf', generatedEcsTgzName, '&&',
        'npm init --yes && npm install ./package &&',
        'cd .. && rm -r', testPackagePath
    ]
    itExecutes(testCommands.join(' '), workingDir)
  })
})
