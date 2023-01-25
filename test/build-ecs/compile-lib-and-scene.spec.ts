import { resolve } from 'path'
import { itDeletesFolder, itExecutes, ensureFileExists } from '../../scripts/helpers'

function buildEcsBuildLibFlow() {
  const cwd = resolve(__dirname, './fixtures/dcl-test-lib-integration')
  describe('build-ecs: build lib', () => {
    itDeletesFolder('./bin', cwd)
    itDeletesFolder('./node_modules', cwd)

    itExecutes('npm i --silent --no-progress', cwd)
    itExecutes('npm run --silent build', cwd)

    it('ensure files exist', () => {
      ensureFileExists('bin/index.js', cwd)
      ensureFileExists('bin/index.d.ts', cwd)
    })
  })
  return { cwd }
}

describe('integration flow, build libs and build scene using libs', () => {
  const { cwd: ecsLibCwd } = buildEcsBuildLibFlow()
  const sceneCwd = resolve(__dirname, './fixtures/simple-scene-with-library')

  // install libs
  itDeletesFolder('./node_modules', sceneCwd)
  itExecutes('npm install --silent --no-progress ' + JSON.stringify(ecsLibCwd), sceneCwd)
  // install rest of dependencies, if any
  itExecutes('npm install --silent --no-progress', sceneCwd)

  describe('build-ecs: build scene with library DEBUG mode', () => {
    itDeletesFolder('./bin', sceneCwd)

    itExecutes('npm run --silent build', sceneCwd)

    it('ensure files exist', () => {
      ensureFileExists('bin/game.js', sceneCwd)
    })
  })

  describe('build-ecs: build scene with library, production mode', () => {
    itDeletesFolder('./bin', sceneCwd)

    itExecutes('npm run build-prod', sceneCwd)

    it('ensure files exist', () => {
      ensureFileExists('bin/game.js', sceneCwd)
    })
  })
})

describe('integration flow with bundledDependencies, build libs and build scene using libs', () => {
  const { cwd: ecsLibCwd } = buildEcsBuildLibFlow()
  const sceneCwd = resolve(__dirname, './fixtures/simple-scene-with-bundled')

  // install libs
  itDeletesFolder('./node_modules', sceneCwd)
  itExecutes('npm install --silent --no-progress ' + JSON.stringify(ecsLibCwd), sceneCwd)
  // install rest of dependencies, if any
  itExecutes('npm install --silent --no-progress', sceneCwd)

  describe('build-ecs: build scene with library DEBUG mode', () => {
    itDeletesFolder('./bin', sceneCwd)

    itExecutes('npm run --silent build', sceneCwd)

    it('ensure files exist', () => {
      ensureFileExists('bin/game.js', sceneCwd)
    })
  })

  describe('build-ecs: build scene with library, production mode', () => {
    itDeletesFolder('./bin', sceneCwd)

    itExecutes('npm run build-prod', sceneCwd)

    it('ensure files exist', () => {
      ensureFileExists('bin/game.js', sceneCwd)
    })
  })
})
