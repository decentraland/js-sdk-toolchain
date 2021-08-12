import { resolve } from 'path'
import { flow, commonChecks, ECS_PATH, BUILD_ECS_PATH, DECENTRALAND_AMD_PATH, ROLLUP_CONFIG_PATH } from './common'
import { itExecutes, patchJson, readJson } from './helpers'
import { existsSync, readFileSync, writeFileSync } from 'fs'

flow('build-all', () => {
  ;``
  commonChecks()

  flow('pack every package', () => {
    const rootPath = resolve(__dirname, '..')
    const ecsPackageJsonPath = resolve(ECS_PATH, 'package.json')
    const ecsPackageLockJsonPath = resolve(ECS_PATH, 'package-lock.json')

    // This information can be found in `npm pack --json` output
    let dclAmdTgzFilename = 'dcl-amd-0.0.0.tgz'
    let dclBuildEcsTgzFilename = 'dcl-build-ecs-0.0.0.tgz'

    itExecutes('npm pack', DECENTRALAND_AMD_PATH)
    itExecutes('npm pack', ROLLUP_CONFIG_PATH)
    itExecutes('npm pack', BUILD_ECS_PATH)

    itExecutes(`cp ${DECENTRALAND_AMD_PATH}/${dclAmdTgzFilename} ${ECS_PATH}`, rootPath)
    itExecutes(`cp ${BUILD_ECS_PATH}/${dclBuildEcsTgzFilename} ${ECS_PATH}`, rootPath)

    const backupPackageJson = readFileSync(ecsPackageJsonPath).toString()
    const backupPackageLockJson = existsSync(ecsPackageLockJsonPath)
      ? readFileSync(ecsPackageLockJsonPath).toString()
      : ''

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

    itExecutes('npm pack', ECS_PATH)

    // restore
    itExecutes(`rm ${DECENTRALAND_AMD_PATH}/${dclAmdTgzFilename}`, rootPath)
    itExecutes(`rm ${BUILD_ECS_PATH}/${dclBuildEcsTgzFilename}`, rootPath)

    writeFileSync(ecsPackageJsonPath, backupPackageJson)
    if (backupPackageJson.length > 0) {
      writeFileSync(ecsPackageLockJsonPath, backupPackageLockJson)
    }
  })
})
