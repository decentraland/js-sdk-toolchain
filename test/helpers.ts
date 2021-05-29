import { exec } from 'child_process'
import { resolve } from 'path'
import { existsSync } from 'fs'
import { sync as rimraf } from 'rimraf'
/**
 * @returns the resolved absolute path
 */
export function ensureFileExists(root: string, file: string) {
  const x = resolve(root, file.replace(/^\//, ''))

  if (!existsSync(x)) {
    throw new Error(`${x} does not exist`)
  }

  return x
}

export function executeStep(command: string, cwd: string) {
  it(
    command,
    async () => {
      await new Promise<string>((onSuccess, onError) => {
        exec(command, { cwd }, (error, stdout, stderr) => {
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
