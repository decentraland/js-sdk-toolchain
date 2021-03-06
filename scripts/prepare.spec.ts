import {
  flow,
  commonChecks,
  SDK_PATH,
  BUILD_ECS_PATH,
  DECENTRALAND_AMD_PATH,
  ROLLUP_CONFIG_PATH
} from './common'
import {
  itExecutes,
  itInstallsADependencyFromFolderAndCopiesTheVersion
} from './helpers'

flow('build-all', () => {
  commonChecks()

  flow('@dcl/sdk', () => {
    // update dependencies versions and link packages
    itInstallsADependencyFromFolderAndCopiesTheVersion(SDK_PATH, BUILD_ECS_PATH)
    itInstallsADependencyFromFolderAndCopiesTheVersion(
      SDK_PATH,
      DECENTRALAND_AMD_PATH
    )
  })

  flow('pack every package', () => {
    itExecutes('npm pack', SDK_PATH)
    itExecutes('npm pack', DECENTRALAND_AMD_PATH)
    itExecutes('npm pack', ROLLUP_CONFIG_PATH + '/dist')
    itExecutes('npm pack', BUILD_ECS_PATH + '/dist')
  })
})
