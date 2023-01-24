import { readJsonSync } from 'fs-extra'
import { SDK_PATH } from '../scripts/common'
import path from 'path'

describe('Check there is fixed version', () => {
  it('should @dcl/sdk has fixed version dependencies', async () => {
    const packageJsonPath = path.resolve(SDK_PATH, 'package.json')
    const packageJson = readJsonSync(packageJsonPath)

    const requiredDependencies = [
      '@dcl/dcl-rollup',
      '@dcl/ecs-math',
      '@dcl/ecs',
      '@dcl/js-runtime',
      '@dcl/kernel',
      '@dcl/react-ecs',
      '@dcl/unity-renderer'
    ]

    const dependencies = Object.keys(packageJson.dependencies || {})

    const untrackedDependency = requiredDependencies.filter(
      (item) => !dependencies.includes(item)
    )

    if (untrackedDependency.length) {
      throw new Error(
        `There are some untracked libraries: ${untrackedDependency}`
      )
    }

    for (const libName in packageJson.dependencies) {
      if (libName.startsWith('@dcl/')) {
        const libVersion = packageJson.dependencies[libName]
        if (libVersion === 'next' || libVersion.startsWith('^')) {
          throw new Error(
            `The library ${libName} has a non-fixed version: ${JSON.stringify(
              libVersion
            )}`
          )
        }
      }
    }
  })
})
