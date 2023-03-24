import { resolve } from 'path'
import { readFileSync } from 'fs'
import { itExecutes, ensureFileExists, itDeletesFolder } from '../../scripts/helpers'

describe('build: simple scene compilation', () => {
  const cwd = resolve(__dirname, './fixtures/ecs7-scene')

  itDeletesFolder('./bin', cwd)
  itDeletesFolder('./node_modules', cwd)

  itExecutes('npm i --silent --no-progress', cwd)
  itExecutes('npm run build --silent', cwd)

  it('ensure files exist', () => {
    const binPath = ensureFileExists('bin/game.js', cwd)
    const fileText = readFileSync(binPath, 'utf8')
    const ecs7Included = fileText.includes(`require('~system/EngineApi')`)
    if (!ecs7Included) {
      throw new Error("scene doesn't include require('~system/EngineApi')")
    }

    const transformComponentInclided = fileText.includes(`TransformComponent`)
    if (!transformComponentInclided) {
      throw new Error("scene doesn't include TransformComponent")
    }
  })
})

describe('build: side-effect-free-build', () => {
  const cwd = resolve(__dirname, './fixtures/side-effect-free-build')

  itDeletesFolder('./bin', cwd)
  itDeletesFolder('./node_modules', cwd)

  itExecutes('npm i --silent --no-progress', cwd)
  itExecutes('npm run build --silent -- --production', cwd)

  it('ensure files exist', () => {
    const binPath = ensureFileExists('bin/game.js', cwd)
    const fileText = readFileSync(binPath, 'utf8')
    expect(fileText.trim()).toEqual('"use strict";')
  })
})
