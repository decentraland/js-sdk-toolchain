import { resolve } from 'path'
import { readFileSync } from 'fs'
import { executeStep, ensureFileExists, rmFolder } from '../../scripts/helpers'

describe('simple-scene-without-installed-ecs: build a scene with env vars', () => {
  const cwd = resolve(__dirname, './fixtures/simple-scene-without-installed-ecs')

  rmFolder('./bin', cwd)

  const ECS_PATH = resolve(__dirname, '../../packages/decentraland-ecs/dist/src/index.js')
  const AMD_PATH = resolve(__dirname, '../../packages/@dcl/amd/dist/amd.js')

  executeStep('npm run --quiet build', cwd, {
    ...process.env,
    ECS_PATH,
    AMD_PATH
  })

  it('ensure files exist', () => {
    ensureFileExists( 'bin/game.js',cwd)
    ensureFileExists( 'bin/game.js.lib',cwd)
  })

  it('ensure it uses not minified versions in .lib', () => {
    const lib: any[] = JSON.parse(readFileSync(resolve(cwd, 'bin/game.js.lib')).toString()).map(($: { path: string }) =>
      resolve(cwd, $.path)
    )
    expect(lib).toContain(ECS_PATH)
    expect(lib).toContain(AMD_PATH)
  })
})
