import { resolve } from 'path'
import { readFileSync } from 'fs'
import { executeStep, ensureFileExists, rmFolder } from '../../scripts/helpers'

describe('legacy decentraland-ecs sanity checks', () => {
  testLegacyEcsFlow('6.6.3')
  testLegacyEcsFlow('6.6.4')
  testLegacyEcsFlow('6.6.5')
})

function testLegacyEcsFlow(version: string) {
  describe(`decentraland-ecs@${version}`, () => {
    const cwd = resolve(__dirname, './fixtures/simple-scene-old-ecs')

    rmFolder('./bin', cwd)
    rmFolder('./node_modules', cwd)

    executeStep(`npm install decentraland-ecs@${version}`, cwd)
    executeStep('npm install --quiet --no-progress', cwd)
    executeStep('npm run --quiet build', cwd)

    it('ensure generated files exist', () => {
      ensureFileExists(cwd, 'bin/game.js')
      ensureFileExists(cwd, 'bin/game.js.lib')
    })

    it('ensure it uses not minified versions in .lib', () => {
      const lib: any[] = JSON.parse(readFileSync(resolve(cwd, 'bin/game.js.lib')).toString()).map(
        ($: { path: string }) => resolve(cwd, $.path)
      )
      expect(lib).toContain(resolve(cwd, 'node_modules/decentraland-ecs/artifacts/amd.js'))
      expect(lib).toContain(resolve(cwd, 'node_modules/decentraland-ecs/dist/src/index.js'))
    })
  })
}
