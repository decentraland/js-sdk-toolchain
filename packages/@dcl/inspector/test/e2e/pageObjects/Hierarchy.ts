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

  async isAncestor(entityId: number, parent: number) {
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
    const label = await item.evaluate((el) => el.textContent)
    return label || ''
  }

  async rename(entityId: number, newLabel: string) {
    const item = await this.getItem(entityId)
    await item.click({ button: 'right' })
    const rename = await item.$('.contexify_item[itemid="rename"')
    if (!rename) {
      throw new Error(`Can't rename entity with id=${entityId}`)
    }
    await rename.click()
    const label = await this.getLabel(entityId)
    for (let i = 0; i < label.length; i++) {
      await page.keyboard.press('Backspace')
    }
    await page.keyboard.type(newLabel)
    await page.keyboard.press('Enter')
  }

  async remove(entityId: number) {
    const item = await this.getItem(entityId)
    await item.click({ button: 'right' })
    const remove = await item.$('.contexify_item[itemid="delete"')
    if (!remove) {
      throw new Error(`Can't delete entity with id=${entityId}`)
    }
    await remove.click()
  }

  async exists(entityId: number) {
    try {
      await this.getItem(entityId)
      return true
    } catch (error) {
      return false
    }
  }
}

export const Hierarchy = new HierarchyPageObject()
