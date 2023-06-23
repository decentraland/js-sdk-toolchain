import { dragAndDrop } from '../utils/drag-and-drop'
import { sleep } from '../utils/sleep'

class HierarchyPageObject {
  getItemSelector(entityId: number) {
    return `.Hierarchy .Tree[data-test-id="${entityId}"] .item`
  }

  async getItem(entityId: number) {
    const item = await page.$(this.getItemSelector(entityId))
    if (!item) {
      throw new Error(`Could not find entity with id=${entityId}`)
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

  async addChild(entityId: number, label: string) {
    const item = await this.getItem(entityId)
    await item.click({ button: 'right' })
    const addChild = await item.$('.contexify_item[itemid="add-child"')
    if (!addChild) {
      throw new Error(`Can't add child to entity with id=${entityId}`)
    }
    await addChild.click()
    await page.keyboard.type(label)
    await page.keyboard.press('Enter')
  }

  async getLabel(entityId: number) {
    const item = await this.getItem(entityId)
    return item.evaluate((el) => el.textContent)
  }

  async hasLabel(entityId: number, label: string) {
    const _label = await this.getLabel(entityId)
    return _label === label
  }
}

export const Hierarchy = new HierarchyPageObject()
