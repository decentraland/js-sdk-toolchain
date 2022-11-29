import {
  flow,
  commonChecks,
  SDK_PATH,
  ROLLUP_CONFIG_PATH,
  JS_RUNTIME,
  ECS7_PATH,
  REACT_ECS
} from './common'

import {
  itExecutes,
  itInstallsADependencyFromFolderAndCopiesTheVersion
} from './helpers'

flow('build-all', () => {
  commonChecks()

  flow('@dcl/sdk', () => {
    // update dependencies versions and link packages
    itInstallsADependencyFromFolderAndCopiesTheVersion(
      SDK_PATH,
      ROLLUP_CONFIG_PATH
    )
    itInstallsADependencyFromFolderAndCopiesTheVersion(SDK_PATH, ECS7_PATH)
    itInstallsADependencyFromFolderAndCopiesTheVersion(SDK_PATH, REACT_ECS)
    itInstallsADependencyFromFolderAndCopiesTheVersion(SDK_PATH, JS_RUNTIME)
  })

  flow('pack every package', () => {
    itExecutes('npm pack', SDK_PATH)
    itExecutes('npm pack', JS_RUNTIME)
    itExecutes('npm pack', ECS7_PATH)
    itExecutes('npm pack', REACT_ECS)
    itExecutes('npm pack', ROLLUP_CONFIG_PATH)
  })
})
