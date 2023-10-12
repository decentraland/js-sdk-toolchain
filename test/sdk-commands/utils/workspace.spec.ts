import path from 'path'
import { initComponents } from '../../../packages/@dcl/sdk-commands/src/components'
import * as w from '../../../packages/@dcl/sdk-commands/src/logic/workspace-validations'

describe('workspace', () => {
  test('loads a dcl-workspace.json', async () => {
    const components = await initComponents()
    const validWorkspace = await w.getValidWorkspace(components, 'test/build-ecs/fixtures')
    expect(validWorkspace.rootWorkingDirectory).toEqual(path.resolve('test/build-ecs/fixtures'))
    expect(validWorkspace.projects).toHaveLength(2)
    expect(validWorkspace.projects.map(($) => $.workingDirectory)).toEqual([
      path.resolve('test/build-ecs/fixtures/ecs7-scene'),
      path.resolve('test/build-ecs/fixtures/ecs7-ui-ethereum')
    ])
  })
})
