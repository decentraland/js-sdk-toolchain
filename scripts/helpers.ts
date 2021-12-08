import { exec } from 'child_process'
import { sync as globSync } from 'glob'
import { resolve } from 'path'
import {
  existsSync,
  readFileSync,
  writeFileSync,
  lstatSync,
  removeSync,
  copySync
} from 'fs-extra'
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

export function runCommand(
  command: string,
  cwd: string,
  env?: Record<string, string>
): Promise<string> {
  return new Promise<string>((onSuccess, onError) => {
    process.stdout.write('∑ ' + cwd + '; ' + command + '\n')
    exec(command, { cwd, env }, (error, stdout, stderr) => {
      stdout.trim().length &&
        process.stdout.write('  ' + stdout.replace(/\n/g, '\n  ') + '\n')
      stderr.trim().length &&
        process.stderr.write('! ' + stderr.replace(/\n/g, '\n  ') + '\n')

      if (error) {
        onError(stderr)
      } else {
        onSuccess(stdout)
      }
    })
  })
}

export function itExecutes(
  command: string,
  cwd: string,
  env?: Record<string, string>
) {
  it(command, async () => await runCommand(command, cwd, env), 60000)
}

export function itDeletesFolder(folder: string, cwd: string) {
  const path = resolve(cwd, folder)
  it('rm -rf ' + path, () => {
    rimraf(path)
  })
}
export function itDeletesGlob(pattern: string, cwd: string) {
  it(`deletes ${pattern} in ${cwd}`, () => {
    globSync(pattern, { absolute: true, cwd }).forEach((file) => {
      console.log(`> deleting ${file}`)
      rimraf(file)
    })
  })
}

export function readJson(file: string, cwd: string): any {
  return JSON.parse(readFileSync(resolve(cwd, file)).toString())
}

export function patchJson(
  file: string,
  cwd: string,
  redux: (previous: any) => any
): any {
  const path = resolve(cwd, file)
  return writeFileSync(
    path,
    JSON.stringify(redux(JSON.parse(readFileSync(path).toString())), null, 2)
  )
}

export function itInstallsADependencyFromFolderAndCopiesTheVersion(
  cwd: string,
  depPath: string,
  devDependency = false
) {
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

export function copyFile(from: string, to: string) {
  console.log(`> copying ${from} to ${to}`)

  if (!existsSync(from)) {
    throw new Error(`${from} does not exist`)
  }

  // if it is not a file, remove it to avoid conflict with symbolic links
  if (existsSync(to)) {
    const type = lstatSync(to)
    if (!type.isFile()) {
      removeSync(to)
    }
  }

  copySync(from, to)

  if (!existsSync(to)) {
    throw new Error(`${to} does not exist`)
  }
}
