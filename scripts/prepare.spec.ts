import { readFileSync } from 'fs'
import { pathExistsSync } from 'fs-extra'
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
    installCrossDependencies(ROLLUP_CONFIG_PATH, SDK_PATH, ECS7_PATH, REACT_ECS, JS_RUNTIME, PLAYGROUND_ASSETS_PATH)
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

// this step checks for dependencies in this monorepo and fixes their versions
function installCrossDependencies(...paths: string[]) {
  for (const path of paths) {
    const packageJson = resolve(path, 'package.json')
    const { dependencies, devDependencies } = JSON.parse(readFileSync(packageJson, 'utf-8'))

    for (const [key] of Object.entries({ ...dependencies, ...devDependencies } as Record<string, string>)) {
      if (key.startsWith('@dcl')) {
        const dependencyRootPath = resolve('packages', key)
        if (pathExistsSync(dependencyRootPath)) {
          itInstallsADependencyFromFolderAndCopiesTheVersion(path, dependencyRootPath, key in devDependencies)
        }
      }
    }
  }
}

function checkNoLocalPackages(...paths: string[]) {
  for (const path of paths) {
    const packageJson = resolve(path, 'package.json')
    it('checking ' + packageJson, async () => {
      const { dependencies, devDependencies } = JSON.parse(await readFile(packageJson, 'utf-8'))
      const errors: string[] = []
      for (const [key, value] of Object.entries({ ...dependencies, ...devDependencies } as Record<string, string>)) {
        if (
          value.startsWith('file:') ||
          value.startsWith('http:') ||
          value.startsWith('https:') ||
          value.startsWith('git:')
        ) {
          errors.push(`Dependency ${key} is not pointing to a published version: ${value}`)
        }
      }
      if (errors.length) {
        throw new Error(errors.join('\n'))
      }
    })
  }
}
