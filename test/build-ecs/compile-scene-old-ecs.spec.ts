import { resolve } from 'path'
import { readFileSync } from 'fs'
import {
  itExecutes,
  ensureFileExists,
  itDeletesFolder
} from '../../scripts/helpers'

describe('legacy decentraland-ecs sanity checks', () => {
  testLegacyEcsFlow('6.6.3')
  testLegacyEcsFlow('6.6.4')
  testLegacyEcsFlow('6.6.5')
})

function testLegacyEcsFlow(version: string) {
  describe(`decentraland-ecs@${version}`, () => {
    const cwd = resolve(__dirname, './fixtures/simple-scene-old-ecs')

    itDeletesFolder('./bin', cwd)
    itDeletesFolder('./node_modules', cwd)

    itExecutes(`npm install decentraland-ecs@${version}`, cwd)
    itExecutes('npm install --quiet --no-progress', cwd)
    itExecutes('npm run --quiet build', cwd)

    it('ensure generated files exist', () => {
      ensureFileExists('bin/game.js', cwd)
      ensureFileExists('bin/game.js.lib', cwd)
    })

    it('ensure it uses not minified versions in .lib', () => {
      const lib: any[] = JSON.parse(
        readFileSync(resolve(cwd, 'bin/game.js.lib')).toString()
      ).map(($: { path: string }) => resolve(cwd, $.path))
      expect(lib).toContain(
        resolve(cwd, 'node_modules/decentraland-ecs/artifacts/amd.js')
      )
      expect(lib).toContain(
        resolve(cwd, 'node_modules/decentraland-ecs/dist/src/index.js')
      )
    })
  })
}
