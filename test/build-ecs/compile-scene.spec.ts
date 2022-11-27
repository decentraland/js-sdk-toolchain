import { resolve } from 'path'
import {
  itExecutes,
  ensureFileExists,
  itDeletesFolder
} from '../../scripts/helpers'

const ecsLocation = resolve(__dirname, '../../packages/@dcl/sdk')

describe('build-ecs: simple scene compilation', () => {
  const cwd = resolve(__dirname, './fixtures/simple-scene')

  itDeletesFolder('./bin', cwd)
  itDeletesFolder('./node_modules', cwd)

  itExecutes('npm install --silent --no-progress ' + ecsLocation, cwd)
  itExecutes('npm i --silent --no-progress', cwd)
  itExecutes('npm run --silent build', cwd)

  it('ensure files exist', () => {
    ensureFileExists('bin/game.js', cwd)
  })
})

describe('build-ecs: simple scene compilation, production mode', () => {
  const cwd = resolve(__dirname, './fixtures/simple-scene')

  itDeletesFolder('./bin', cwd)
  itDeletesFolder('./node_modules', cwd)

  itExecutes('npm install --silent --no-progress', cwd)
  itExecutes('npm run --silent build-prod', cwd)

  it('ensure files exist', () => {
    ensureFileExists('bin/game.js', cwd)
  })
})

describe('build-ecs: scene with react', () => {
  const cwd = resolve(__dirname, './fixtures/ecs7-ui')

  itDeletesFolder('./bin', cwd)
  itDeletesFolder('./node_modules', cwd)

  itExecutes('npm install --silent --no-progress', cwd)
  itExecutes('npm run --silent build-prod', cwd)

  it('ensure files exist', () => {
    ensureFileExists('bin/game.js', cwd)
  })
})
