import { resolve } from 'path'
import { flow, commonChecks, ECS_PATH, BUILD_ECS_PATH, DECENTRALAND_AMD_PATH, ROLLUP_CONFIG_PATH } from './common'
import { patchJson, runCommand } from './helpers'
import { existsSync, readFileSync, writeFileSync } from 'fs'

flow('build local ecs package', () => {
  ;``
  commonChecks()

  const rootPath = resolve(__dirname, '..')
  const ecsPackageJsonPath = resolve(ECS_PATH, 'package.json')
  const ecsPackageLockJsonPath = resolve(ECS_PATH, 'package-lock.json')

  const dclAmdTgzFilename = 'local-dcl-amd.tgz'
  const dclBuildEcsTgzFilename = 'local-dcl-build-ecs.tgz'
  const dclEcsTgzFilename = 'local-decentraland-ecs.tgz'

  let backupPackageJson = '',
    backupPackageLockJson = ''

  beforeAll(() => {
    backupPackageJson = readFileSync(ecsPackageJsonPath).toString()
    if (existsSync(ecsPackageLockJsonPath)) {
      backupPackageLockJson = readFileSync(ecsPackageLockJsonPath).toString()
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

    await runCommand(
      `cp ${resolve(DECENTRALAND_AMD_PATH, amdPackJson[0]['filename'])} ${resolve(ECS_PATH, dclAmdTgzFilename)}`,
      rootPath
    )
    await runCommand(
      `cp ${resolve(BUILD_ECS_PATH, buildEcsPackJson[0]['filename'])} ${resolve(ECS_PATH, dclBuildEcsTgzFilename)}`,
      rootPath
    )

    const ecsPackJson = JSON.parse(await runCommand('npm pack --json', ECS_PATH))
    expect(ecsPackJson[0]['filename']).toBeTruthy()

    await runCommand(
      `mv ${resolve(ECS_PATH, ecsPackJson[0]['filename'])} ${resolve(ECS_PATH, dclEcsTgzFilename)}`,
      rootPath
    )
  })

  afterAll(async () => {
    // restore package.json to original version?
    // itExecutes(`rm ${DECENTRALAND_AMD_PATH}/${dclAmdTgzFilename}`, rootPath)
    // itExecutes(`rm ${BUILD_ECS_PATH}/${dclBuildEcsTgzFilename}`, rootPath)

    writeFileSync(ecsPackageJsonPath, backupPackageJson)
    if (backupPackageJson.length > 0) {
      writeFileSync(ecsPackageLockJsonPath, backupPackageLockJson)
    }
  })
})
