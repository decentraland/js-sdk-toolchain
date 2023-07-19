import { E2E_URL } from './_config'
import { App } from './pageObjects/App'
import { Hierarchy } from './pageObjects/Hierarchy'
import { installMouseHelper } from './utils/install-mouse-helper'

const ROOT = 0

describe('Hierarchy', () => {
  beforeAll(async () => {
    await installMouseHelper(page)
    await page.goto(E2E_URL)
    await App.waitUntilReady()
  }, 100_000)

  test('create a new entity', async () => {
    await Hierarchy.addChild(ROOT, 'new entity')
    await expect(Hierarchy.getId('new entity')).resolves.toBeGreaterThanOrEqual(512)
  }, 100_000)

  test('add three children to the entity', async () => {
    const parent = await Hierarchy.getId('new entity')
    await Hierarchy.addChild(parent, 'child 1')
    await Hierarchy.addChild(parent, 'child 2')
    await Hierarchy.addChild(parent, 'child 3')
    const child1 = await Hierarchy.getId('child 1')
    const child2 = await Hierarchy.getId('child 2')
    const child3 = await Hierarchy.getId('child 3')
    await expect(Hierarchy.isAncestor(child1, parent)).resolves.toBe(true)
    await expect(Hierarchy.isAncestor(child2, parent)).resolves.toBe(true)
    await expect(Hierarchy.isAncestor(child3, parent)).resolves.toBe(true)
  }, 100_000)

  test('reparent "child 2" under "child 1"', async () => {
    const child1 = await Hierarchy.getId('child 1')
    const child2 = await Hierarchy.getId('child 2')
    await expect(Hierarchy.isAncestor(child2, child1)).resolves.toBe(false)
    await Hierarchy.setParent(child2, child1)
    await expect(Hierarchy.isAncestor(child2, child1)).resolves.toBe(true)
  }, 100_000)

  test('move "child 2" to the root entity\'s children', async () => {
    const child2 = await Hierarchy.getId('child 2')
    await Hierarchy.setParent(child2, ROOT)
    const child1 = await Hierarchy.getId('child 2')
    await expect(Hierarchy.isAncestor(child2, child1)).resolves.toBe(false)
  }, 100_000)

  test('move "child 3" before "child 1" inside "new entity"', async () => {
    const parent = await Hierarchy.getId('new entity')
    const child1 = await Hierarchy.getId('child 1')
    const child3 = await Hierarchy.getId('child 3')
    await Hierarchy.setParent(child3, parent, { x: 'inside', y: 'after' })

    // check that parent is still the same for both childs
    await expect(Hierarchy.isAncestor(child1, parent)).resolves.toBe(true)
    await expect(Hierarchy.isAncestor(child3, parent)).resolves.toBe(true)

    await expect(Hierarchy.hasChildrenInOrder(parent, child3, child1)).resolves.toBe(true)
  }, 100_000)

  test('add "child 4" to the root entity and move it after "child 3" inside "new entity"', async () => {
    await Hierarchy.addChild(ROOT, 'child 4')
    const parent = await Hierarchy.getId('new entity')
    const child1 = await Hierarchy.getId('child 1')
    const child3 = await Hierarchy.getId('child 3')
    const child4 = await Hierarchy.getId('child 4')
    await Hierarchy.setParent(child4, child3, { x: 'inside', y: 'after' })

    // check that parent is the same for all childs
    await expect(Hierarchy.isAncestor(child1, parent)).resolves.toBe(true)
    await expect(Hierarchy.isAncestor(child3, parent)).resolves.toBe(true)
    await expect(Hierarchy.isAncestor(child4, parent)).resolves.toBe(true)

    await expect(Hierarchy.hasChildrenInOrder(parent, child3, child4, child1)).resolves.toBe(true)
  }, 100_000)

  test('duplicate "new entity"', async () => {
    const parent = await Hierarchy.getId('new entity')
    const parentChildrenIds = await Hierarchy.getChildrenIds(parent, '.Tree')
    await Hierarchy.duplicate(parent)
    const rootChildrenIds = await Hierarchy.getChildrenIds(ROOT, '.Tree.is-parent')
    const lastChildId = rootChildrenIds.pop() || NaN
    const lastChildLabel = await Hierarchy.getLabel(lastChildId)
    await Hierarchy.toggleOpen(lastChildId)
    const duplicatedChildrenIds = await Hierarchy.getChildrenIds(lastChildId, '.Tree')

    expect(lastChildLabel).toBe('new entity')
    expect(duplicatedChildrenIds.length).toBe(parentChildrenIds.length)
  }, 100_000)

  test('rename "child 2" to "gltf', async () => {
    const child2 = await Hierarchy.getId('child 2')
    await Hierarchy.rename(child2, 'gltf')
    await expect(Hierarchy.getId('gltf')).resolves.not.toThrow()
    await expect(Hierarchy.getLabel(child2)).resolves.toBe('gltf')
  }, 100_000)

  test('add GltfContainer to "gltf"', async () => {
    const gltf = await Hierarchy.getId('gltf')
    await expect(Hierarchy.addComponent(gltf, 'GltfContainer')).resolves.not.toThrow()
  }, 100_000)

  test('check it\'s not possible to add another GltfContainer to "gltf"', async () => {
    const gltf = await Hierarchy.getId('gltf')
    await expect(Hierarchy.addComponent(gltf, 'GltfContainer')).rejects.toThrow()
  }, 100_000)
  test('delete an entity', async () => {
    const gltf = await Hierarchy.getId('gltf')
    await expect(Hierarchy.exists(gltf)).resolves.toBe(true)
    await Hierarchy.remove(gltf)
    await expect(Hierarchy.exists(gltf)).resolves.toBe(false)
  }, 100_000)
  test('delete the parent entity with its children', async () => {
    const parent = await Hierarchy.getId('new entity')
    const child = await Hierarchy.getId('child 1')
    await expect(Hierarchy.exists(parent)).resolves.toBe(true)
    await expect(Hierarchy.exists(child)).resolves.toBe(true)
    await Hierarchy.remove(parent)
    await expect(Hierarchy.exists(parent)).resolves.toBe(false)
    await expect(Hierarchy.exists(child)).resolves.toBe(false)
  }, 100_000)
})
