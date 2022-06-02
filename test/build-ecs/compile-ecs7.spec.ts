import { resolve } from 'path'
import { readFileSync } from 'fs'
import {
  itExecutes,
  ensureFileExists,
  itDeletesFolder
} from '../../scripts/helpers'

describe('build-ecs: simple scene compilation', () => {
  const cwd = resolve(__dirname, './fixtures/ecs7-scene')

  itDeletesFolder('./bin', cwd)
  itDeletesFolder('./node_modules', cwd)

  itExecutes('npm i --quiet --no-progress', cwd)
  itExecutes('npm run --quiet build', cwd)

  it('ensure files exist', () => {
    const binPath = ensureFileExists('bin/game.js', cwd)
    ensureFileExists('bin/game.js.lib', cwd)
    const fileText = readFileSync(binPath, 'utf8')
    const ecs7Included = fileText.includes(
      'packages/decentraland-ecs/dist/ecs7/index.js'
    )
    const legacyEcsIncluded = fileText.includes(
      'packages/decentraland-ecs/dist/index.js'
    )
    if (!ecs7Included) {
      throw new Error('ECS 7 not loaded correctly')
    }
    if (legacyEcsIncluded) {
      throw new Error('Bundled legacy ecs.')
    }
  })

  // it('ensure it uses not minified versions in .lib', () => {
  //   const lib: any[] = JSON.parse(
  //     readFileSync(resolve(cwd, 'bin/game.js.lib')).toString()
  //   ).map(($: { path: string }) => resolve(cwd, $.path))
  //   expect(lib).toContain(resolve('packages/@dcl/amd/dist/amd.js'))
  //   expect(lib).toContain(
  //     resolve('packages/decentraland-ecs/dist/src/index.js')
  //   )
  // })
})

// describe('build-ecs: simple scene compilation, production mode', () => {
//   const cwd = resolve(__dirname, './fixtures/simple-scene')

//   itDeletesFolder('./bin', cwd)
//   itDeletesFolder('./node_modules', cwd)

//   itExecutes('npm install --quiet --no-progress', cwd)
//   itExecutes('npm run --quiet build-prod', cwd)

//   it('ensure files exist', () => {
//     ensureFileExists('bin/game.js', cwd)
//     ensureFileExists('bin/game.js.lib', cwd)
//   })

//   it('ensure it uses minified versions in .lib', () => {
//     const lib: any[] = JSON.parse(
//       readFileSync(resolve(cwd, 'bin/game.js.lib')).toString()
//     ).map(($: { path: string }) => resolve(cwd, $.path))
//     expect(lib).toContain(resolve('packages/@dcl/amd/dist/amd.min.js'))
//     expect(lib).toContain(
//       resolve('packages/decentraland-ecs/dist/src/index.min.js')
//     )
//   })
// })
