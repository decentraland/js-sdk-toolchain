import * as fs from 'fs'
import * as path from 'path'
import { flow, commonChecks, ECS_PATH, BUILD_ECS_PATH, DECENTRALAND_AMD_PATH, ROLLUP_CONFIG_PATH } from './common'
import { patchJson, runCommand } from './helpers'

flow('build local ecs package', () => {
  ;``
  commonChecks()

  const rootPath = path.resolve(__dirname, '..')
  const ecsPackageJsonPath = path.resolve(ECS_PATH, 'package.json')
  const ecsPackageLockJsonPath = path.resolve(ECS_PATH, 'package-lock.json')

  const dclAmdTgzFilename = 'local-dcl-amd.tgz'
  const dclBuildEcsTgzFilename = 'local-dcl-build-ecs.tgz'
  const dclEcsTgzFilename = 'local-decentraland-ecs.tgz'

  let backupPackageJson = '',
    backupPackageLockJson = ''

  beforeAll(() => {
    backupPackageJson = fs.readFileSync(ecsPackageJsonPath).toString()
    if (fs.existsSync(ecsPackageLockJsonPath)) {
      backupPackageLockJson = fs.readFileSync(ecsPackageLockJsonPath).toString()
    }

    const redux = ($: any) => ({
      ...$,
      files: [...($.files || []), dclAmdTgzFilename, dclBuildEcsTgzFilename],
      dependencies: {
        ...($.dependencies || {}),
        '@dcl/amd': `file:./${dclAmdTgzFilename}`,
        '@dcl/build-ecs': `file:./${dclBuildEcsTgzFilename}`
      }
    })

    patchJson('package.json', ECS_PATH, redux)
    if (backupPackageLockJson.length > 0) {
      patchJson('package-lock.json', ECS_PATH, redux)
    }
  })

  it('pack every package', async () => {
    const amdPackJson = JSON.parse(await runCommand('npm pack --json', DECENTRALAND_AMD_PATH))
    const rollUpPackJson = JSON.parse(await runCommand('npm pack --json', ROLLUP_CONFIG_PATH))
    const buildEcsPackJson = JSON.parse(await runCommand('npm pack --json', BUILD_ECS_PATH))

    expect(buildEcsPackJson[0]['filename']).toBeTruthy()
    expect(amdPackJson[0]['filename']).toBeTruthy()

    fs.copyFileSync(
      path.resolve(DECENTRALAND_AMD_PATH, amdPackJson[0]['filename']),
      path.resolve(ECS_PATH, dclAmdTgzFilename)
    )
    fs.copyFileSync(
      path.resolve(BUILD_ECS_PATH, buildEcsPackJson[0]['filename']),
      path.resolve(ECS_PATH, dclBuildEcsTgzFilename)
    )

    const ecsPackJson = JSON.parse(await runCommand('npm pack --json', ECS_PATH))
    expect(ecsPackJson[0]['filename']).toBeTruthy()

    fs.renameSync(path.resolve(ECS_PATH, ecsPackJson[0]['filename']), path.resolve(ECS_PATH, dclEcsTgzFilename))
  })

  afterAll(async () => {
    fs.writeFileSync(ecsPackageJsonPath, backupPackageJson)
    if (backupPackageJson.length > 0) {
      fs.writeFileSync(ecsPackageLockJsonPath, backupPackageLockJson)
    }
  })
})
