import { join, resolve } from 'path'
import { createFsComponent } from '../../packages/@dcl/sdk-commands/src/components/fs'
import { getInstalledPackageVersion } from '../../packages/@dcl/sdk-commands/src/logic/config'
import { itExecutes, ensureFileExists, itDeletesFolder } from '../../scripts/helpers'
import { assertFilesExist, loadSourceMap } from './sourcemaps'

const ecsLocation = resolve(__dirname, '../../packages/@dcl/sdk')

describe('build-ecs: simple scene compilation', () => {
  const cwd = resolve(__dirname, './fixtures/simple-scene')

  itDeletesFolder('./bin', cwd)
  itDeletesFolder('./node_modules', cwd)

  itExecutes('npm install --silent --no-progress ' + ecsLocation, cwd)
  itExecutes('npm i --silent --no-progress', cwd)
  itExecutes('npm run --silent build', cwd)

  it('ensure files exist', async () => {
    ensureFileExists('bin/game.js', cwd)

    expect(await getInstalledPackageVersion({ fs: createFsComponent() }, '@dcl/sdk', cwd)).toEqual('7.0.0')

    const { map } = await loadSourceMap(join(cwd, 'bin/game.js'))
    assertFilesExist(map)
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
  const cwd = resolve(__dirname, './fixtures/ecs7-ui-ethereum')

  itDeletesFolder('./bin', cwd)
  itDeletesFolder('./node_modules', cwd)

  itExecutes('npm install --silent --no-progress', cwd)
  itExecutes('npm run --silent build-prod', cwd)

  it('ensure files exist', () => {
    ensureFileExists('bin/game.js', cwd)
  })
})
