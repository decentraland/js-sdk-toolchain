import { AssetsTab } from '../../../src/components/Assets/types'
import { dragAndDrop } from '../utils/drag-and-drop'

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

  async selectAsset(asset: string) {
    await dragAndDrop(`.Assets .asset[data-test-label="${asset}"]`, `.Renderer canvas`)
    // simulate a mouse move to trigger the onPointerObservable from getPointerCoords in mouse-utils.ts
    const renderer = await page.$(`.Renderer canvas`)
    const box = await renderer!.boundingBox()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  }
}

export const Assets = new AssetsPageObject()
