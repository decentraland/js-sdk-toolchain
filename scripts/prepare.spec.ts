import { readFile } from 'fs/promises'
import { resolve } from 'path'
import {
  flow,
  commonChecks,
  SDK_PATH,
  ROLLUP_CONFIG_PATH,
  JS_RUNTIME,
  ECS7_PATH,
  REACT_ECS,
  PLAYGROUND_ASSETS_PATH,
  INSPECTOR_PATH
} from './common'

import { itExecutes, itInstallsADependencyFromFolderAndCopiesTheVersion } from './helpers'

flow('build-all', () => {
  commonChecks()

  flow('@dcl/sdk', () => {
    // update dependencies versions and link packages
    itInstallsADependencyFromFolderAndCopiesTheVersion(SDK_PATH, ROLLUP_CONFIG_PATH)
    itInstallsADependencyFromFolderAndCopiesTheVersion(SDK_PATH, ECS7_PATH)
    itInstallsADependencyFromFolderAndCopiesTheVersion(SDK_PATH, REACT_ECS)
    itInstallsADependencyFromFolderAndCopiesTheVersion(SDK_PATH, JS_RUNTIME)
    itInstallsADependencyFromFolderAndCopiesTheVersion(ECS7_PATH, JS_RUNTIME)
    itInstallsADependencyFromFolderAndCopiesTheVersion(PLAYGROUND_ASSETS_PATH, SDK_PATH)

    checkNoLocalPackages(ROLLUP_CONFIG_PATH, SDK_PATH, ECS7_PATH, REACT_ECS, JS_RUNTIME, PLAYGROUND_ASSETS_PATH)
  })

  flow('pack every package', () => {
    itExecutes('npm pack', SDK_PATH)
    itExecutes('npm pack', JS_RUNTIME)
    itExecutes('npm pack', ECS7_PATH)
    itExecutes('npm pack', REACT_ECS)
    itExecutes('npm pack', ROLLUP_CONFIG_PATH)
    itExecutes('npm pack', INSPECTOR_PATH)
  })
})

function checkNoLocalPackages(...paths: string[]) {
  for (const path of paths) {
    const packageJson = resolve(path, 'package.json')
    it('checking ' + packageJson, async () => {
      const { dependencies } = JSON.parse(await readFile(packageJson, 'utf-8'))
      for (const [key, value] of Object.entries(dependencies as Record<string, string>)) {
        if (
          value.startsWith('file:') ||
          value.startsWith('http:') ||
          value.startsWith('https:') ||
          value.startsWith('git:')
        ) {
          throw new Error(`Dependency ${key} is not pointing to a published version: ${value}`)
        }
      }
    })
  }
}
