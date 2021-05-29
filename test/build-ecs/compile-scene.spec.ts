import { exec } from 'child_process'
import { resolve } from 'path'
import { existsSync, readFileSync } from 'fs'
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

export async function execute(command: string, cwd: string): Promise<string> {
  return new Promise<string>((onSuccess, onError) => {
    console.log(`> ${command}`)
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
}

describe('build-ecs: simple scene compilation', () => {
  const cwd = resolve(__dirname, './fixtures/simple-scene')

  it('clean the folder', () => {
    rimraf(resolve(cwd, './bin'))
  })

  it('npm run build', async function () {
    await execute('npm run build', cwd)
  }, 60000)

  it('ensure files exist', () => {
    ensureFileExists(cwd, 'bin/game.js')
    ensureFileExists(cwd, 'bin/game.js.lib')
  })

  it('ensure it uses not minified versions in .lib', () => {
    const lib: any[] = JSON.parse(readFileSync(resolve(cwd, 'bin/game.js.lib')).toString()).map(($: {path: string}) => $.path)
    expect(lib).toContain('node_modules/decentraland-ecs/artifacts/amd.js')
  })
})

describe('build-ecs: simple scene compilation, production mode', () => {
  const cwd = resolve(__dirname, './fixtures/simple-scene')

  it('clean the folder', () => {
    rimraf(resolve(cwd, './bin'))
  })

  it('npm run build-prod', async function () {
    await execute('npm run build-prod', cwd)
  }, 60000)

  it('ensure files exist', () => {
    ensureFileExists(cwd, 'bin/game.js')
    ensureFileExists(cwd, 'bin/game.js.lib')
  })

  it('ensure it uses minified versions in .lib', () => {
    const lib: any[] = JSON.parse(readFileSync(resolve(cwd, 'bin/game.js.lib')).toString()).map(($: {path: string}) => $.path)
    expect(lib).toContain('node_modules/decentraland-ecs/artifacts/amd.min.js')
  })
})
