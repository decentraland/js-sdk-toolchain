import { App } from './pageObjects/App'
import { Hierarchy } from './pageObjects/Hierarchy'
import { installMouseHelper } from './utils/install-mouse-helper'

describe('Hierarchy', () => {
  beforeAll(async () => {
    await installMouseHelper(page)
    await page.goto('http://localhost:8000')
    await App.waitUntilReady()
  }, 100_000)

  test('create a new entity', async () => {
    await Hierarchy.addChild(0, 'new entity')
    await expect(Hierarchy.getId('new entity')).resolves.toBeGreaterThanOrEqual(512)
  })

  test('add two children to the entity', async () => {
    const parent = await Hierarchy.getId('new entity')
    await Hierarchy.addChild(parent, 'child 1')
    await Hierarchy.addChild(parent, 'child 2')
    const child1 = await Hierarchy.getId('child 1')
    const child2 = await Hierarchy.getId('child 2')
    await expect(Hierarchy.isAncestor(child1, parent)).resolves.toBe(true)
    await expect(Hierarchy.isAncestor(child2, parent)).resolves.toBe(true)
  })

  test('reparent "child 2" under "child 1"', async () => {
    const child1 = await Hierarchy.getId('child 1')
    const child2 = await Hierarchy.getId('child 2')
    await expect(Hierarchy.isAncestor(child2, child1)).resolves.toBe(false)
    await Hierarchy.setParent(child2, child1)
    await expect(Hierarchy.isAncestor(child2, child1)).resolves.toBe(true)
  })

  test('move "child 2" to the root entity\'s children', async () => {
    const child2 = await Hierarchy.getId('child 2')
    await Hierarchy.setParent(child2, 0)
    const child1 = await Hierarchy.getId('child 2')
    await expect(Hierarchy.isAncestor(child2, child1)).resolves.toBe(false)
  })

  test('rename "child 2" to "gltf', async () => {
    const child2 = await Hierarchy.getId('child 2')
    await Hierarchy.rename(child2, 'gltf')
    await expect(Hierarchy.getId('gltf')).resolves.not.toThrow()
    await expect(Hierarchy.getLabel(child2)).resolves.toBe('gltf')
  })

  test('add GltfContainer to "gltf"', async () => {
    const gltf = await Hierarchy.getId('gltf')
    await expect(Hierarchy.addComponent(gltf, 'GltfContainer')).resolves.not.toThrow()
  })

  test('check it\'s not possible to add another GltfContainer to "gltf"', async () => {
    const gltf = await Hierarchy.getId('gltf')
    await expect(Hierarchy.addComponent(gltf, 'GltfContainer')).rejects.toThrow()
  })
  test('delete an entity', async () => {
    const gltf = await Hierarchy.getId('gltf')
    await expect(Hierarchy.exists(gltf)).resolves.toBe(true)
    await Hierarchy.remove(gltf)
    await expect(Hierarchy.exists(gltf)).resolves.toBe(false)
  })
  test('delete the parent entity with its children', async () => {
    const parent = await Hierarchy.getId('new entity')
    const child = await Hierarchy.getId('child 1')
    await expect(Hierarchy.exists(parent)).resolves.toBe(true)
    await expect(Hierarchy.exists(child)).resolves.toBe(true)
    await Hierarchy.remove(parent)
    await expect(Hierarchy.exists(parent)).resolves.toBe(false)
    await expect(Hierarchy.exists(child)).resolves.toBe(false)
  })
})
