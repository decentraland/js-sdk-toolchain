import { resolve } from 'path'
import { readFileSync } from 'fs'
import { executeStep, ensureFileExists, rmFolder } from '../helpers'

describe('build-ecs: simple scene compilation', () => {
  const cwd = resolve(__dirname, './fixtures/simple-scene')

  rmFolder('./bin', cwd)

  executeStep('npm install --quiet --no-progress', cwd)
  executeStep('npm run --quiet build', cwd)

  it('ensure files exist', () => {
    ensureFileExists(cwd, 'bin/game.js')
    ensureFileExists(cwd, 'bin/game.js.lib')
  })

  it('ensure it uses not minified versions in .lib', () => {
    const lib: any[] = JSON.parse(readFileSync(resolve(cwd, 'bin/game.js.lib')).toString()).map(
      ($: { path: string }) => $.path
    )
    expect(lib).toContain('node_modules/decentraland-ecs/artifacts/amd.js')
  })
})

describe('build-ecs: simple scene compilation, production mode', () => {
  const cwd = resolve(__dirname, './fixtures/simple-scene')

  rmFolder('./bin', cwd)

  executeStep('npm install --quiet --no-progress', cwd)
  executeStep('npm run --quiet build-prod', cwd)

  it('ensure files exist', () => {
    ensureFileExists(cwd, 'bin/game.js')
    ensureFileExists(cwd, 'bin/game.js.lib')
  })

  it('ensure it uses minified versions in .lib', () => {
    const lib: any[] = JSON.parse(readFileSync(resolve(cwd, 'bin/game.js.lib')).toString()).map(
      ($: { path: string }) => $.path
    )
    expect(lib).toContain('node_modules/decentraland-ecs/artifacts/amd.min.js')
  })
})
