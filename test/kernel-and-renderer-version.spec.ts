import { readJsonSync } from 'fs-extra'
import { ECS7_PATH, SDK_PATH } from '../scripts/common'
import path from 'path'

function checkDeps(folder: string): Record<string, string> {
  const packageJsonPath = path.resolve(folder, 'package.json')
  const packageJson = readJsonSync(packageJsonPath)

  for (const libName in packageJson.dependencies) {
    if (libName.startsWith('@dcl/')) {
      const libVersion = packageJson.dependencies[libName]
      if (libVersion === 'next' || libVersion.startsWith('^')) {
        throw new Error(
          `The library ${libName} has a non-fixed version: ${JSON.stringify(libVersion)} in the file ${packageJsonPath}`
        )
      }
    }
  }

  return packageJson.dependencies || {}
}

describe('Check there is fixed version', () => {
  it('should @dcl/ecs has fixed version dependencies', async () => {
    checkDeps(ECS7_PATH)
  })

  it('should @dcl/sdk has fixed version dependencies', async () => {
    const sdkDeps = checkDeps(SDK_PATH)
    const requiredDependencies = [
      '@dcl/sdk-commands',
      '@dcl/ecs-math',
      '@dcl/ecs',
      '@dcl/js-runtime',
      '@dcl/explorer',
      '@dcl/react-ecs'
    ]

    const dependencies = Object.keys(sdkDeps)

    const untrackedDependency = requiredDependencies.filter((item) => !dependencies.includes(item))

    if (untrackedDependency.length) {
      throw new Error(`There are some untracked libraries: ${untrackedDependency}`)
    }
  })
})
