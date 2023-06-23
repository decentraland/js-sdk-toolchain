import { App } from './pageObjects/App'
import { Hierarchy } from './pageObjects/Hierarchy'
import { installMouseHelper } from './utils/install-mouse-helper'
import { sleep } from './utils/sleep'

describe('Entity Inspector', () => {
  beforeAll(async () => {
    await installMouseHelper(page)
    await page.goto('http://localhost:8000')
    await page.waitForNetworkIdle()
    await App.waitUntilReady()
  }, 100000)

  test('should drag and drop"', async () => {
    await Hierarchy.setParent(512, 513)
    await expect(Hierarchy.isAncestor(512, 513)).resolves.toBe(true)
    await Hierarchy.setParent(512, 0)
    await expect(Hierarchy.isAncestor(512, 513)).resolves.toBe(false)
    await expect(Hierarchy.isAncestor(512, 0)).resolves.toBe(true)
    await Hierarchy.setParent(0, 512)
    await expect(Hierarchy.isAncestor(0, 512)).resolves.toBe(false)
    await Hierarchy.addChild(512, 'pepe')
    await expect(Hierarchy.getLabel(514)).resolves.toBe('pepe')
    await expect(Hierarchy.isAncestor(514, 512)).resolves.toBe(true)
    await Hierarchy.rename(514, 'new pepe')
    await expect(Hierarchy.getLabel(514)).resolves.toBe('new pepe')
    await Hierarchy.remove(514)
    await expect(Hierarchy.exists(514)).resolves.toBe(false)
    await sleep(5000)
  }, 100000)
})
