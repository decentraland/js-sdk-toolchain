import { App } from './pageObjects/App'
import { Hierarchy } from './pageObjects/Hierarchy'
import { installMouseHelper } from './utils/install-mouse-helper'

describe('Hierarchy', () => {
  beforeAll(async () => {
    await installMouseHelper(page)
    await page.goto('http://localhost:8000')
    await App.waitUntilReady()
  }, 100000)

  test('create a new entity', async () => {
    await Hierarchy.addChild(0, 'new entity')
    await expect(Hierarchy.exists(514)).resolves.toBe(true)
    await expect(Hierarchy.getLabel(514)).resolves.toBe('new entity')
  })

  test('add two children to the entity', async () => {
    await Hierarchy.addChild(514, 'child 1')
    await Hierarchy.addChild(514, 'child 2')
    await expect(Hierarchy.isAncestor(515, 514)).resolves.toBe(true)
    await expect(Hierarchy.isAncestor(516, 514)).resolves.toBe(true)
  })

  test('reparent "child 2" under "child 1"', async () => {
    await expect(Hierarchy.isAncestor(516, 515)).resolves.toBe(false)
    await Hierarchy.setParent(516, 515)
    await expect(Hierarchy.isAncestor(516, 515)).resolves.toBe(true)
  })

  test('move "child 2" to the root entity\'s children', async () => {
    await Hierarchy.setParent(516, 0)
    await expect(Hierarchy.isAncestor(515, 516)).resolves.toBe(false)
  })

  test('rename "child 2" to "gltf', async () => {
    await Hierarchy.rename(516, 'gltf')
    await expect(Hierarchy.getLabel(516)).resolves.toBe('gltf')
  })

  test('add GltfContainer to "gltf"', async () => {
    await Hierarchy.addComponent(516, 'GltfContainer')
  })

  test('check it\'s not possible to add another GltfContainer to "gltf"', async () => {
    await expect(Hierarchy.addComponent(516, 'GltfContainer')).rejects.toThrowError()
  })
})
