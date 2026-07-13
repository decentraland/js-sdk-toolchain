import { resolve } from 'path'
import { readFileSync } from 'fs'
import { itExecutes, ensureFileExists, itDeletesFolder } from '../../scripts/helpers'

describe('build: simple scene compilation', () => {
  const cwd = resolve(__dirname, './fixtures/ecs7-scene')

  itDeletesFolder('./bin', cwd)
  itDeletesFolder('./node_modules', cwd)

  itExecutes('npm i --silent --no-progress', cwd)
  itExecutes('npm run build --silent', cwd)

  it('emits the SDK-runtime chunk, the scene chunk and a loader stub', () => {
    // a scene builds as three files: the scene's main is a loader stub that wires the other two
    const stub = readFileSync(ensureFileExists('bin/game.js', cwd), 'utf8')
    const sceneText = readFileSync(ensureFileExists('bin/scene.js', cwd), 'utf8')
    const sdkText = readFileSync(ensureFileExists('bin/sdk-runtime.js', cwd), 'utf8')

    // the loader stub reads both chunks from the scene runtime
    expect(stub).toContain('bin/sdk-runtime.js')
    expect(stub).toContain('bin/scene.js')
    expect(stub).toContain('~system/Runtime')

    // the scene chunk stays lean: it requires the SDK as an external and never inlines it
    expect(sceneText).toContain('require("@dcl/ecs")')
    expect(sceneText).not.toContain('~system/EngineApi')
    // ...nor pulls in SDK-only dependencies (they belong to the SDK-runtime chunk)
    expect(sceneText).not.toContain('text-encoding')

    // the SDK-runtime chunk carries the engine and components and exposes the require registry
    expect(sdkText).toContain('require("~system/EngineApi")')
    expect(sdkText).toContain('Transform(engine)')
    expect(sdkText).toContain('module.exports = registry')
    // the registry is the probed candidate superset, not just this scene's imports:
    // ecs7-scene never touches ethereum, yet same-SDK scenes share one chunk
    expect(sdkText).toContain('"@dcl/sdk/ethereum-provider"')
  })
})
describe('build: scene with etherum', () => {
  const cwd = resolve(__dirname, './fixtures/ecs7-ui-ethereum')

  itDeletesFolder('./bin', cwd)
  itDeletesFolder('./node_modules', cwd)

  itExecutes('npm i --silent --no-progress', cwd)
  itExecutes('npm run build --silent', cwd)

  it('ensure files exist', () => {
    ensureFileExists('bin/game.js', cwd)
    const sceneText = readFileSync(ensureFileExists('bin/scene.js', cwd), 'utf8')
    const sdkText = readFileSync(ensureFileExists('bin/sdk-runtime.js', cwd), 'utf8')

    // the scene requires the ethereum provider as an external
    expect(sceneText).toContain('require("@dcl/sdk/ethereum-provider")')
    // ethereum support (text-encoding) ships in the shared SDK-runtime chunk
    expect(sdkText).toContain('text-encoding')
  })

  // a react + ethereum scene also builds in production mode (formerly compile-scene's
  // 'scene with react'); kept in this file so nothing else mutates the fixture concurrently
  itExecutes('npm run build-prod --silent', cwd)

  it('builds in production mode', () => {
    ensureFileExists('bin/game.js', cwd)
    ensureFileExists('bin/scene.js', cwd)
    ensureFileExists('bin/sdk-runtime.js', cwd)
  })
})
