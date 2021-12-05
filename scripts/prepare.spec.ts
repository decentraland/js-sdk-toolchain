import { resolve } from 'path'
import { flow, commonChecks, ECS_PATH, BUILD_ECS_PATH, DECENTRALAND_AMD_PATH, ROLLUP_CONFIG_PATH, LEGACY_ECS_PATH } from './common'
import { itExecutes, itInstallsADependencyFromFolderAndCopiesTheVersion, readJson } from './helpers'

flow('build-all', () => {
  commonChecks()

  flow('decentraland-ecs', () => {
    // update dependencies versions and link packages
    itInstallsADependencyFromFolderAndCopiesTheVersion(ECS_PATH, BUILD_ECS_PATH)
    itInstallsADependencyFromFolderAndCopiesTheVersion(ECS_PATH, DECENTRALAND_AMD_PATH)
    itInstallsADependencyFromFolderAndCopiesTheVersion(ECS_PATH, LEGACY_ECS_PATH)
  })

  flow('pack every package', () => {
    itExecutes('npm pack', ECS_PATH)
    itExecutes('npm pack', LEGACY_ECS_PATH)
    itExecutes('npm pack', DECENTRALAND_AMD_PATH)
    itExecutes('npm pack', ROLLUP_CONFIG_PATH)
    itExecutes('npm pack', BUILD_ECS_PATH)
  })
})
