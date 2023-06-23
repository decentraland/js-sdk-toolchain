import { dragAndDrop } from '../utils/drag-and-drop'

class HierarchyPageObject {
  getItemSelector(entityId: number) {
    return `.Hierarchy .Tree[data-test-id="${entityId}"] .item`
  }

  async getItem(entityId: number) {
    const item = await page.$(this.getItemSelector(entityId))
    if (!item) {
      throw new Error('Not Found')
    }
    return item
  }

  async setParent(entityId: number, parent: number) {
    await dragAndDrop(this.getItemSelector(entityId), this.getItemSelector(parent))
  }

  async isParent(entityId: number, parent: number) {
    const item = await page.$(`.Hierarchy .Tree[data-test-id="${parent}"] .Tree[data-test-id="${entityId}"] .item`)
    return item !== null
  }
}

export const Hierarchy = new HierarchyPageObject()
