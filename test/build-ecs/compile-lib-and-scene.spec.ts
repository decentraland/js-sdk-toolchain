import { resolve } from 'path'
import { readFileSync } from 'fs'
import { itDeletesFolder, itExecutes, ensureFileExists } from '../../scripts/helpers'

function buildEcsBuildLibFlow() {
  const cwd = resolve(__dirname, './fixtures/dcl-test-lib-integration')
  describe('build-ecs: build lib', () => {
    itDeletesFolder('./bin', cwd)
    itDeletesFolder('./node_modules', cwd)

    itExecutes('npm i --quiet --no-progress', cwd)
    itExecutes('npm run --quiet build', cwd)

    it('ensure files exist', () => {
      ensureFileExists('bin/lib.js', cwd)
      ensureFileExists('bin/lib.js.lib', cwd)
      ensureFileExists('bin/lib.d.ts', cwd)
      ensureFileExists('bin/lib.min.js', cwd)
    })
  })
  return { cwd }
}

function rollupBuildLibFlow() {
  const cwd = resolve(__dirname, './fixtures/rollup-lib-integration')
  describe('rollup: build lib', () => {
    itDeletesFolder('./dist', cwd)

    itExecutes('npm run --quiet build', cwd)

    it('ensure files exist', () => {
      ensureFileExists('dist/index.d.ts', cwd)
      ensureFileExists('dist/index.js', cwd)
      ensureFileExists('dist/index.min.js', cwd)
      ensureFileExists('dist/index.min.js.map', cwd)
    })
  })
  return { cwd }
}

describe('integration flow, build libs and build scene using libs', () => {
  const { cwd: ecsLibCwd } = buildEcsBuildLibFlow()
  const { cwd: rollupLibCwd } = rollupBuildLibFlow()
  const sceneCwd = resolve(__dirname, './fixtures/simple-scene-with-library')

  // install libs
  itDeletesFolder('./node_modules', sceneCwd)
  itExecutes('npm install --quiet --no-progress -B ' + JSON.stringify(ecsLibCwd), sceneCwd)
  itExecutes('npm install --quiet --no-progress -B ' + JSON.stringify(rollupLibCwd), sceneCwd)
  // install rest of dependencies, if any
  itExecutes('npm install --quiet --no-progress', sceneCwd)

  describe('build-ecs: build scene with library DEBUG mode', () => {
    itDeletesFolder('./bin', sceneCwd)

    itExecutes('npm run --quiet build', sceneCwd)

    it('ensure files exist', () => {
      ensureFileExists('bin/game.js', sceneCwd)
      ensureFileExists('bin/game.js.lib', sceneCwd)
    })

    it('ensure it uses NON MINIFIED versions in .lib', () => {
      const lib: any[] = JSON.parse(readFileSync(resolve(sceneCwd, 'bin/game.js.lib')).toString()).map(
        ($: { path: string }) => resolve(sceneCwd, $.path)
      )
      expect(lib).toContain(resolve(ecsLibCwd, 'bin/lib.js'))
      expect(lib).toContain(resolve(rollupLibCwd, 'dist/index.js'))
      expect(lib).toContain(resolve(sceneCwd, 'node_modules/eth-connect/eth-connect.js'))
    })
  })

  describe('build-ecs: build scene with library, production mode', () => {
    itDeletesFolder('./bin', sceneCwd)

    itExecutes('npm run build-prod', sceneCwd)

    it('ensure files exist', () => {
      ensureFileExists('bin/game.js', sceneCwd)
      ensureFileExists('bin/game.js.lib', sceneCwd)
    })

    it('ensure it uses minified versions in .lib', () => {
      const lib: any[] = JSON.parse(readFileSync(resolve(sceneCwd, 'bin/game.js.lib')).toString()).map(
        ($: { path: string }) => resolve(sceneCwd, $.path)
      )
      expect(lib).toContain(resolve(ecsLibCwd, 'bin/lib.min.js'))
      expect(lib).toContain(resolve(rollupLibCwd, 'dist/index.min.js'))
      expect(lib).toContain(resolve(sceneCwd, 'node_modules/eth-connect/eth-connect.js'))
    })
  })
})
