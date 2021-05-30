import { exec } from 'child_process'
import { resolve } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { sync as rimraf } from 'rimraf'

/**
 * @returns the resolved absolute path
 */
export function ensureFileExists(file: string,root: string) {
  const x = resolve(root, file.replace(/^\//, ''))

  if (!existsSync(x)) {
    throw new Error(`${x} does not exist`)
  }

  return x
}

export function executeStep(command: string, cwd: string, env?: Record<string, string>) {
  it(
    command,
    async () => {
      await new Promise<string>((onSuccess, onError) => {
        exec(command, { cwd, env }, (error, stdout, stderr) => {
          stdout.trim().length && console.log('  ' + stdout.replace(/\n/g, '\n  '))
          stderr.trim().length && console.log('! ' + stderr.replace(/\n/g, '\n  '))

          if (error) {
            onError(stderr)
          } else {
            onSuccess(stdout)
          }
        })
      })
    },
    30000
  )
}

export function rmFolder(folder: string, cwd: string) {
  const path = resolve(cwd, folder)
  it('rm -rf ' + path, () => {
    rimraf(path)
  })
}

export function readJson(file: string, cwd: string): any {
  return JSON.parse(readFileSync(resolve(cwd, file)).toString())
}

export function patchJson(file: string, cwd: string, redux: (previous: any) => any): any {
  const path = resolve(cwd, file)
  return writeFileSync(path, JSON.stringify(redux(JSON.parse(readFileSync(path).toString())), null, 2))
}

export function installDependencyWithVersion(cwd: string, depPath: string, devDependency = false) {
  const dependencies = devDependency ? 'devDependencies' : 'dependencies'

  executeStep(`npm install --quiet ${depPath}`, cwd)

  it(`update ${dependencies} version ${depPath} in ${cwd}`, () => {
    const depPackageJson = readJson('package.json', depPath)
    patchJson('package.json', cwd, ($) => {
      return {
        ...$,
        [dependencies]: {
          ...($[dependencies] || {}),
          [depPackageJson.name]: depPackageJson.version
        }
      }
    })
    if (existsSync(resolve(cwd, 'package-lock.json'))) {
      patchJson('package-lock.json', cwd, ($) => {
        return {
          ...$,
          dependencies: {
            ...($[dependencies] || {}),
            [depPackageJson.name]: undefined
          }
        }
      })
    }
  })
}
