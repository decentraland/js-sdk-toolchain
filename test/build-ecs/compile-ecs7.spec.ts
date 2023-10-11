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
    const ecs7Included = fileText.includes(`require("~system/EngineApi")`)
    if (!ecs7Included) {
      throw new Error('scene doesn\'t include require("~system/EngineApi")')
    }

    const transformComponentIncluded = fileText.includes(`Transform(engine)`)
    if (!transformComponentIncluded) {
      throw new Error("scene doesn't include Transform(engine)")
    }
    const textEncodingLibraryIncluded = fileText.includes('text-encoding')
    if (textEncodingLibraryIncluded) {
      throw new Error('textEncoding is being bundled in the scene.')
    }
  })
})
describe('build: scene with etherum', () => {
  const cwd = resolve(__dirname, './fixtures/ecs7-ui-ethereum')

  itDeletesFolder('./bin', cwd)
  itDeletesFolder('./node_modules', cwd)

  itExecutes('npm i --silent --no-progress', cwd)
  itExecutes('npm run build --silent', cwd)

  it('ensure files exist', () => {
    const binPath = ensureFileExists('bin/game.js', cwd)
    const fileText = readFileSync(binPath, 'utf8')

    const textEncodingLibraryIncluded = fileText.includes('text-encoding')
    if (!textEncodingLibraryIncluded) {
      throw new Error(`scene doesn't include textEncoding`)
    }
  })
})
