import { App } from './pageObjects/App'
import { Hierarchy } from './pageObjects/Hierarchy'
import { installMouseHelper } from './utils/install-mouse-helper'

describe('Entity Inspector', () => {
  beforeAll(async () => {
    await installMouseHelper(page)
    await page.goto('http://localhost:8000')
    await App.waitUntilReady()
  }, 100000)

  it('should drag and drop"', async () => {
    await Hierarchy.setParent(512, 513)
    await expect(Hierarchy.isParent(512, 513)).resolves.toBe(true)
    await Hierarchy.setParent(512, 0)
    await expect(Hierarchy.isParent(512, 513)).resolves.toBe(false)
    await expect(Hierarchy.isParent(512, 0)).resolves.toBe(true)
    await Hierarchy.setParent(0, 512)
    await expect(Hierarchy.isParent(0, 512)).resolves.toBe(false)
  }, 100000)
})
