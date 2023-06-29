import { AssetsTab } from '../../src/components/Assets/types'
import { E2E_URL } from './_config'
import { App } from './pageObjects/App'
import { Assets } from './pageObjects/Assets'
import { Hierarchy } from './pageObjects/Hierarchy'
import { installMouseHelper } from './utils/install-mouse-helper'

describe('Assets', () => {
  beforeAll(async () => {
    await installMouseHelper(page)
    await page.goto(E2E_URL)
    await App.waitUntilReady()
  }, 100_000)

  test('Drag builder asset into renderer', async () => {
    // There should not be an entity in the Hierarchy tree with the name Pebbles at the start
    await expect(Hierarchy.getId('Pebbles')).rejects.toThrow()

    await Assets.selectTab(AssetsTab.AssetsPack)
    await Assets.selectAssetPack('Voxels Pack')
    await Assets.selectAsset('Pebbles')

    // wait for renderer to load
    await page.waitForSelector('.Renderer.is-loading')
    await page.waitForSelector('.Renderer.is-loaded')

    // There should be an entity in the Hierarchy tree with the name Pebbles
    await expect(Hierarchy.getId('Pebbles')).resolves.toBeGreaterThanOrEqual(152)
  }, 100_000)
})
