import { AssetsTab } from '../../../src/redux/ui/types'
import { dragAndDrop } from '../utils/drag-and-drop'
import { sleep } from '../utils/sleep'

class AssetsPageObject {
  async selectTab(tab: AssetsTab) {
    const element = await page.$(`.Assets .tab[data-test-id="${tab}"]`)
    if (element) {
      await element.click()
    }
  }

  async selectAssetPack(assetPack: string) {
    const element = await page.$(`.Assets .theme[data-test-label="${assetPack}"]`)
    if (element) {
      await element.click()
    }
  }

  private async waitForRenderer() {
    // simulate a mouse move to trigger the onPointerObservable from getPointerCoords in mouse-utils.ts
    const renderer = await page.$(`.Renderer canvas`)
    const box = await renderer!.boundingBox()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    // wait for renderer to load
    await sleep(32)
    if (await page.$('.Renderer.is-loading')) {
      await page.waitForSelector('.Renderer.is-loading')
    }
    await page.waitForSelector('.Renderer.is-loaded', { timeout: 180_000 })
  }

  async addBuilderAsset(asset: string) {
    await dragAndDrop(`.Assets .asset[data-test-label="${asset}"]`, `.Renderer canvas`)
    await this.waitForRenderer()
  }

  async openFolder(path: string) {
    const element = await page.$(`.FolderView .Tile[data-test-id="${path}"]`)
    if (element) {
      await element.click({ clickCount: 2 })
    }
  }

  async addFileSystemAsset(path: string) {
    await dragAndDrop(`.FolderView .Tile[data-test-id="${path}"]`, `.Renderer canvas`)
    await this.waitForRenderer()
  }
}

export const Assets = new AssetsPageObject()
