import { readdirSync, readFileSync } from 'fs'
import { pathExistsSync } from 'fs-extra'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { flow, commonChecks } from './common'

import { itExecutes, itInstallsADependencyFromFolderAndCopiesTheVersion } from './helpers'

flow('build-all', () => {
  commonChecks()

  const graph = getMonorepoGraph()

  function resolveProjectPath(packageName: string) {
    return resolve(process.cwd(), './packages/', packageName)
  }

  flow('monorepo has no dependency cycles', () => {
    detectCyclesTest(graph)
  })

  flow('update versions of packages.json copying it from @dcl/sdk', () => {
    const { version } = JSON.parse(readFileSync(resolve('./packages/@dcl/sdk/package.json'), 'utf8'))

    for (const dependency of processWithOptimisticDependencies(graph)) {
      const projectDirectory = resolveProjectPath(dependency)
      itExecutes(
        `npm version ${JSON.stringify(version)} --force --no-git-tag-version --allow-same-version`,
        projectDirectory
      )
    }
  })

  flow('resolve and install dependencies', () => {
    for (const dependency of processWithOptimisticDependencies(graph)) {
      const projectDirectory = resolveProjectPath(dependency)
      installCrossDependencies(projectDirectory)
      checkNoLocalPackages(projectDirectory)
      itExecutes('npm pack', projectDirectory)
    }
  })
})

// process dependencies
function* processWithOptimisticDependencies(graph: Map<string, Set<string>>): Iterable<string> {
  const cloneGraph = structuredClone(graph)
  let modified = false

  do {
    modified = false

    for (const [key, values] of cloneGraph) {
      if (!values.size) {
        for (const [, values] of cloneGraph) {
          values.delete(key)
        }

        cloneGraph.delete(key)
        yield key
        modified = true
        break
      }
    }
  } while (modified)

  if (cloneGraph.size) throw new Error('Could not process the graph optimistically')
}

// returns a map of <Lib, Dep[]>
function getMonorepoGraph(): Map<string, Set<string>> {
  const base = resolve('packages/@dcl')
  const packages = readdirSync(base)

  const graph = new Map<string, Set<string>>()

  for (const path of packages) {
    const packageJson = resolve(base, path, 'package.json')

    const deps = new Set<string>()

    const { dependencies, devDependencies } = JSON.parse(readFileSync(packageJson, 'utf-8'))

    for (const [key] of Object.entries({ ...dependencies, ...devDependencies } as Record<string, string>)) {
      if (key.startsWith('@dcl')) {
        const dependencyRootPath = resolve('packages', key)
        if (pathExistsSync(dependencyRootPath)) {
          deps.add(key)
        }
      }
    }

    graph.set(`@dcl/${path}`, deps)
  }
  return graph
}

function detectCyclesTest(graph: Map<string, Set<string>>) {
  const errors = new Set<string>()
  function getCycle(n: string, path: string[]) {
    if (path.includes(n)) {
      errors.add(`Cyclic dependencies ${path.slice(path.indexOf(n)).concat(n).join(' <- ')}`)
      return
    }
    path.push(n)
    graph.get(n)!.forEach((next) => getCycle(next, path.slice(0)))
  }
  it('check for cycles in imports', () => {
    Object.keys(graph).forEach((n) => getCycle(n, []))
    if (errors.size) throw new Error(Array.from(errors).join('\n'))
  })
}

// this step checks for dependencies in this monorepo and fixes their versions
function installCrossDependencies(...paths: string[]) {
  for (const path of paths) {
    const packageJson = resolve(path, 'package.json')
    const { dependencies, devDependencies } = JSON.parse(readFileSync(packageJson, 'utf-8'))

    for (const [key] of Object.entries({ ...dependencies, ...devDependencies } as Record<string, string>)) {
      if (key.startsWith('@dcl')) {
        const dependencyRootPath = resolve('packages', key)
        if (pathExistsSync(dependencyRootPath)) {
          itInstallsADependencyFromFolderAndCopiesTheVersion(
            path,
            dependencyRootPath,
            (devDependencies && key in devDependencies) || false
          )
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
