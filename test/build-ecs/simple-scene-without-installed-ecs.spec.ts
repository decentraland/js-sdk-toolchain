import { resolve } from 'path'
import { readFileSync } from 'fs'
import {
  itExecutes,
  ensureFileExists,
  itDeletesFolder
} from '../../scripts/helpers'

describe('simple-scene-without-installed-ecs: build a scene with env vars', () => {
  const cwd = resolve(
    __dirname,
    './fixtures/simple-scene-without-installed-ecs'
  )

  itDeletesFolder('./bin', cwd)

  const SDK_PATH = resolve(
    __dirname,
    '../../packages/@dcl/sdk/dist/index.js'
  )
  const AMD_PATH = resolve(__dirname, '../../packages/@dcl/amd/dist/amd.js')

  itExecutes('npm run --quiet build', cwd, {
    ...process.env,
    SDK_PATH,
    AMD_PATH
  })

  it('ensure files exist', () => {
    ensureFileExists('bin/game.js', cwd)
    ensureFileExists('bin/game.js.lib', cwd)
  })

  it('ensure it uses not minified versions in .lib', () => {
    const lib: any[] = JSON.parse(
      readFileSync(resolve(cwd, 'bin/game.js.lib')).toString()
    ).map(($: { path: string }) => resolve(cwd, $.path))
    expect(lib).toContain(SDK_PATH)
    expect(lib).toContain(AMD_PATH)
  })
})
