import { resolve } from 'path'
import { flow, commonChecks, ECS_PATH, BUILD_ECS_PATH, DECENTRALAND_AMD_PATH } from './common'
import { itInstallsADependencyFromFolderAndCopiesTheVersion, readJson } from './helpers'

flow('build-all', () => {
  commonChecks()

  flow('decentraland-ecs', () => {
    // update dependencies versions and link packages
    itInstallsADependencyFromFolderAndCopiesTheVersion(ECS_PATH, BUILD_ECS_PATH)
    itInstallsADependencyFromFolderAndCopiesTheVersion(ECS_PATH, DECENTRALAND_AMD_PATH)
  })
})
