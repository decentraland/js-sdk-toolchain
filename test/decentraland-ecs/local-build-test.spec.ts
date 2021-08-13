import { copyFileSync, mkdir, mkdirSync } from 'fs'
import { resolve } from 'path'
import { runCommand, itExecutes, ensureFileExists } from '../../scripts/helpers'

describe('setup local build of decentraland-ecs package', () => {
  const workingDir = resolve(__dirname, '..', '..')
  const generatedEcsTgzName = 'local-decentraland-ecs.tgz'
  const generatedEcsTgzPath = resolve(workingDir, 'packages', 'decentraland-ecs', generatedEcsTgzName)
  const testPackagePath = resolve(__dirname, `ecs-test-scene-${new Date().getTime()}`)

  beforeAll(async () => {
    await runCommand('make prepare-pr', workingDir)
    expect(ensureFileExists(generatedEcsTgzPath)).toBeTruthy()

    mkdirSync(testPackagePath)
    await runCommand(`tar -xvf ${generatedEcsTgzPath}`, testPackagePath)
  }, 30000)

  itExecutes(`npm init --yes && npm install ./package`, testPackagePath)
})
