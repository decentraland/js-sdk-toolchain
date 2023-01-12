import { readJsonSync } from 'fs-extra'
import { SDK_PATH } from '../scripts/common'
import path from 'path'

describe('Check there is fixed version', () => {
  it('should @dcl/sdk has fixed version dependencies', async () => {
    const packageJsonPath = path.resolve(SDK_PATH, 'package.json')
    const packageJson = readJsonSync(packageJsonPath)

    const otherLocalDependencies = [
      '@dcl/dcl-rollup',
      '@dcl/ecs',
      '@dcl/js-runtime',
      '@dcl/react-ecs',
      'arg',
      'ora'
    ]

    const shouldBeFixedVersion = [
      '@dcl/ecs-math',
      '@dcl/kernel',
      '@dcl/unity-renderer'
    ]

    const allLibraries = [...shouldBeFixedVersion, ...otherLocalDependencies]
    const dependencies = Object.keys(packageJson.dependencies || {})

    if (dependencies.length !== allLibraries.length) {
      const untrackedDependency = dependencies.filter(
        (item) => !allLibraries.includes(item)
      )
      throw new Error(
        `There is some not tracked libraries: ${untrackedDependency}`
      )
    }

    for (const libName of shouldBeFixedVersion) {
      const libVersion = packageJson.dependencies[libName]
      if (typeof libVersion === 'string') {
        if (libVersion === 'next' || libVersion.startsWith('^')) {
          throw new Error(
            `The library ${libName} has a non-fixed version: ${libVersion}`
          )
        }
      } else {
        throw new Error(
          `The library ${libName} isn't added to @dcl/sdk dependencies`
        )
      }
    }
  })
})
