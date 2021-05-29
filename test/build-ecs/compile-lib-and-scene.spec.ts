import { resolve } from 'path'
import { readFileSync } from 'fs'
import { sync as rimraf } from 'rimraf'
import { execute, ensureFileExists } from './compile-scene.spec'

describe('build-ecs: build lib', () => {
  const libCwd = resolve(__dirname, './fixtures/dcl-test-lib-integration')

  it('clean the folder', () => {
    rimraf(resolve(libCwd, './bin'))
  })

  it('npm run build', async function () {
    await execute('npm run build', libCwd)
  }, 60000)

  it('ensure files exist', () => {
    ensureFileExists(libCwd, 'bin/lib.js')
    ensureFileExists(libCwd, 'bin/lib.js.lib')
    ensureFileExists(libCwd, 'bin/lib.d.ts')
    ensureFileExists(libCwd, 'bin/lib.min.js')
  })

  it('npm link', async function () {
    await execute('npm link', libCwd)
  })

  describe('build-ecs: build scene with library', () => {
    const sceneCwd = resolve(__dirname, './fixtures/simple-scene-with-library')

    it('clean the folder', () => {
      rimraf(resolve(sceneCwd, './bin'))
    })

    it('npm link dcl-test-lib-integration', async function () {
      await execute('npm link dcl-test-lib-integration', sceneCwd)
    })

    it('npm run build', async function () {
      await execute('npm run build', sceneCwd)
    }, 60000)

    it('ensure files exist', () => {
      ensureFileExists(sceneCwd, 'bin/game.js')
      ensureFileExists(sceneCwd, 'bin/game.js.lib')
    })

    it('ensure it uses NON MINIFIED versions in .lib', () => {
      const lib: any[] = JSON.parse(readFileSync(resolve(sceneCwd, 'bin/game.js.lib')).toString()).map(
        ($: { path: string }) => $.path
      )
      expect(lib).toContain('../dcl-test-lib-integration/bin/lib.js')
    })
  })


  describe('build-ecs: build scene with library, production mode', () => {
    const sceneCwd = resolve(__dirname, './fixtures/simple-scene-with-library')

    it('clean the folder', () => {
      rimraf(resolve(sceneCwd, './bin'))
    })

    it('npm link dcl-test-lib-integration', async function () {
      await execute('npm link dcl-test-lib-integration', sceneCwd)
    })

    it('npm run build-prod', async function () {
      await execute('npm run build-prod', sceneCwd)
    }, 60000)

    it('ensure files exist', () => {
      ensureFileExists(sceneCwd, 'bin/game.js')
      ensureFileExists(sceneCwd, 'bin/game.js.lib')
    })

    it('ensure it uses minified versions in .lib', () => {
      const lib: any[] = JSON.parse(readFileSync(resolve(sceneCwd, 'bin/game.js.lib')).toString()).map(
        ($: { path: string }) => $.path
      )
      expect(lib).toContain('../dcl-test-lib-integration/bin/lib.min.js')
    })
  })
})
