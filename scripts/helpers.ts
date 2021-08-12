import { exec } from 'child_process'
import { resolve } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { sync as rimraf } from 'rimraf'

/**
 * @returns the resolved absolute path
 */
export function ensureFileExists(file: string, root?: string) {
  const x = root ? resolve(root, file) : file

  if (!existsSync(x)) {
    throw new Error(`${x} does not exist`)
  }

  return x
}

export function runCommand(command: string, cwd: string, env?: Record<string, string>): Promise<string> {
  return new Promise<string>((onSuccess, onError) => {
    process.stdout.write('∑ ' + cwd + '; ' + command + '\n')
    exec(command, { cwd, env }, (error, stdout, stderr) => {
      stdout.trim().length && process.stdout.write('  ' + stdout.replace(/\n/g, '\n  ') + '\n')
      stderr.trim().length && process.stderr.write('! ' + stderr.replace(/\n/g, '\n  ') + '\n')

      if (error) {
        onError(stderr)
      } else {
        onSuccess(stdout)
      }
    })
  })
}

export function itExecutes(command: string, cwd: string, env?: Record<string, string>) {
  it(command, async () => await runCommand(command, cwd, env), 30000)
}

export function itDeletesFolder(folder: string, cwd: string) {
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

export function itInstallsADependencyFromFolderAndCopiesTheVersion(cwd: string, depPath: string, devDependency = false) {
  const dependencies = devDependency ? 'devDependencies' : 'dependencies'

  itExecutes(`npm install --quiet ${depPath}`, cwd)

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
