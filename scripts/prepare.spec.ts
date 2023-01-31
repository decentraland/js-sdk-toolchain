import {
  flow,
  commonChecks,
  SDK_PATH,
  ROLLUP_CONFIG_PATH,
  JS_RUNTIME,
  ECS7_PATH,
  REACT_ECS,
  PLAYGROUND_ASSETS_PATH,
  CRDT_PATH,
  INSPECTOR_PATH
} from './common'

import { itExecutes, itInstallsADependencyFromFolderAndCopiesTheVersion } from './helpers'

flow('build-all', () => {
  commonChecks()

  flow('@dcl/sdk', () => {
    // update dependencies versions and link packages
    itInstallsADependencyFromFolderAndCopiesTheVersion(SDK_PATH, ROLLUP_CONFIG_PATH)
    itInstallsADependencyFromFolderAndCopiesTheVersion(ECS7_PATH, CRDT_PATH)
    itInstallsADependencyFromFolderAndCopiesTheVersion(SDK_PATH, ECS7_PATH)
    itInstallsADependencyFromFolderAndCopiesTheVersion(SDK_PATH, REACT_ECS)
    itInstallsADependencyFromFolderAndCopiesTheVersion(SDK_PATH, JS_RUNTIME)
    itInstallsADependencyFromFolderAndCopiesTheVersion(PLAYGROUND_ASSETS_PATH, SDK_PATH)
  })

  flow('pack every package', () => {
    itExecutes('npm pack', CRDT_PATH)
    itExecutes('npm pack', SDK_PATH)
    itExecutes('npm pack', JS_RUNTIME)
    itExecutes('npm pack', ECS7_PATH)
    itExecutes('npm pack', REACT_ECS)
    itExecutes('npm pack', ROLLUP_CONFIG_PATH)
    itExecutes('npm pack', INSPECTOR_PATH)
  })
})
