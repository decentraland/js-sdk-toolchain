import { resolve } from 'path'
import { readFileSync } from 'fs'
import { executeStep, ensureFileExists, rmFolder } from '../../scripts/helpers'

const ecsLocation = resolve(__dirname, '../../packages/decentraland-ecs')

describe('build-ecs: simple scene compilation', () => {
  const cwd = resolve(__dirname, './fixtures/simple-scene')

  rmFolder('./bin', cwd)
  rmFolder('./node_modules', cwd)

  executeStep('npm install --quiet --no-progress ' + ecsLocation, cwd)
  executeStep('npm i --quiet --no-progress', cwd)
  executeStep('npm run --quiet build', cwd)

  it('ensure files exist', () => {
    ensureFileExists('bin/game.js', cwd)
    ensureFileExists('bin/game.js.lib', cwd)
  })

  it('ensure it uses not minified versions in .lib', () => {
    const lib: any[] = JSON.parse(readFileSync(resolve(cwd, 'bin/game.js.lib')).toString()).map(($: { path: string }) =>
      resolve(cwd, $.path)
    )
    expect(lib).toContain(resolve('packages/@dcl/amd/dist/amd.js'))
    expect(lib).toContain(resolve('packages/decentraland-ecs/dist/src/index.js'))
  })
})

describe('build-ecs: simple scene compilation, production mode', () => {
  const cwd = resolve(__dirname, './fixtures/simple-scene')

  rmFolder('./bin', cwd)
  rmFolder('./node_modules', cwd)

  executeStep('npm install --quiet --no-progress', cwd)
  executeStep('npm run --quiet build-prod', cwd)

  it('ensure files exist', () => {
    ensureFileExists('bin/game.js', cwd)
    ensureFileExists('bin/game.js.lib', cwd)
  })

  it('ensure it uses minified versions in .lib', () => {
    const lib: any[] = JSON.parse(readFileSync(resolve(cwd, 'bin/game.js.lib')).toString()).map(($: { path: string }) =>
      resolve(cwd, $.path)
    )
    expect(lib).toContain(resolve('packages/@dcl/amd/dist/amd.min.js'))
    expect(lib).toContain(resolve('packages/decentraland-ecs/dist/src/index.min.js'))
  })
})
