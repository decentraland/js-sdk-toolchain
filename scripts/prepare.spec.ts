import { copySync } from 'fs-extra'
import {
  flow,
  commonChecks,
  ECS_PATH,
  BUILD_ECS_PATH,
  DECENTRALAND_AMD_PATH,
  ROLLUP_CONFIG_PATH,
  LEGACY_ECS_PATH,
  SCRIPTS_PATH
} from './common'
import {
  itExecutes,
  itInstallsADependencyFromFolderAndCopiesTheVersion
} from './helpers'

flow('build-all', () => {
  commonChecks()

  flow('decentraland-ecs', () => {
    // update dependencies versions and link packages
    itInstallsADependencyFromFolderAndCopiesTheVersion(ECS_PATH, BUILD_ECS_PATH)
    itInstallsADependencyFromFolderAndCopiesTheVersion(
      ECS_PATH,
      DECENTRALAND_AMD_PATH
    )
  })

  flow('pack every package', () => {
    copySync(`${SCRIPTS_PATH}/resources/artifacts`, `${ECS_PATH}/artifacts`, {
      recursive: true
    })
    itExecutes('npm pack', ECS_PATH)
    itExecutes('npm pack', LEGACY_ECS_PATH)
    itExecutes('npm pack', DECENTRALAND_AMD_PATH)
    itExecutes('npm pack', ROLLUP_CONFIG_PATH)
    itExecutes('npm pack', BUILD_ECS_PATH)
  })
})
