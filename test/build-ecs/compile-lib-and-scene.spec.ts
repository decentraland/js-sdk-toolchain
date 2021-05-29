import { resolve } from 'path'
import { readFileSync } from 'fs'
import { rmFolder, executeStep, ensureFileExists } from '../helpers'

function buildEcsBuildLibFlow() {
  const cwd = resolve(__dirname, './fixtures/dcl-test-lib-integration')
  describe('build-ecs: build lib', () => {
    rmFolder('./bin', cwd)

    executeStep('npm install --quiet --no-progress', cwd)
    executeStep('npm run --quiet build', cwd)

    it('ensure files exist', () => {
      ensureFileExists(cwd, 'bin/lib.js')
      ensureFileExists(cwd, 'bin/lib.js.lib')
      ensureFileExists(cwd, 'bin/lib.d.ts')
      ensureFileExists(cwd, 'bin/lib.min.js')
    })
  })
  return { cwd }
}

function rollupBuildLibFlow() {
  const cwd = resolve(__dirname, './fixtures/rollup-lib-integration')
  describe('rollup: build lib', () => {
    rmFolder('./dist', cwd)

    executeStep('npm run --quiet build', cwd)

    it('ensure files exist', () => {
      ensureFileExists(cwd, 'dist/index.d.ts')
      ensureFileExists(cwd, 'dist/index.js')
      ensureFileExists(cwd, 'dist/index.min.js')
      ensureFileExists(cwd, 'dist/index.min.js.map')
    })
  })
  return { cwd }
}

describe('integration flow, build libs and build scene using libs', () => {
  const { cwd: ecsLibCwd } = buildEcsBuildLibFlow()
  const { cwd: rollupLibCwd } = rollupBuildLibFlow()
  const sceneCwd = resolve(__dirname, './fixtures/simple-scene-with-library')

  // install libs
  executeStep('npm install --quiet --no-progress -B ' + JSON.stringify(ecsLibCwd), sceneCwd)
  executeStep('npm install --quiet --no-progress -B ' + JSON.stringify(rollupLibCwd), sceneCwd)
  // install rest of dependencies, if any
  executeStep('npm install --quiet --no-progress', sceneCwd)

  describe('build-ecs: build scene with library DEBUG mode', () => {
    rmFolder('./bin', sceneCwd)

    executeStep('npm run --quiet build', sceneCwd)

    it('ensure files exist', () => {
      ensureFileExists(sceneCwd, 'bin/game.js')
      ensureFileExists(sceneCwd, 'bin/game.js.lib')
    })

    it('ensure it uses NON MINIFIED versions in .lib', () => {
      const lib: any[] = JSON.parse(readFileSync(resolve(sceneCwd, 'bin/game.js.lib')).toString()).map(
        ($: { path: string }) => $.path
      )
      expect(lib).toContain('../dcl-test-lib-integration/bin/lib.js')
      expect(lib).toContain('../rollup-lib-integration/dist/index.js')
      expect(lib).toContain('node_modules/eth-connect/eth-connect.js')
    })
  })

  describe('build-ecs: build scene with library, production mode', () => {
    rmFolder('./bin', sceneCwd)

    executeStep('npm run build-prod', sceneCwd)

    it('ensure files exist', () => {
      ensureFileExists(sceneCwd, 'bin/game.js')
      ensureFileExists(sceneCwd, 'bin/game.js.lib')
    })

    it('ensure it uses minified versions in .lib', () => {
      const lib: any[] = JSON.parse(readFileSync(resolve(sceneCwd, 'bin/game.js.lib')).toString()).map(
        ($: { path: string }) => $.path
      )
      expect(lib).toContain('../dcl-test-lib-integration/bin/lib.min.js')
      expect(lib).toContain('../rollup-lib-integration/dist/index.min.js')
    })
  })
})
