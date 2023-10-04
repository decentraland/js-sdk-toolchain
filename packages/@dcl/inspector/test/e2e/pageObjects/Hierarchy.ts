import { Positions, dragAndDrop } from '../utils/drag-and-drop'

class HierarchyPageObject {
  getParentSelectorById(entityId: number) {
    return `.Hierarchy .Tree.is-parent[data-test-id="${entityId}"]`
  }

  getItemSelectorById(entityId: number) {
    return `.Hierarchy .Tree[data-test-id="${entityId}"] .item`
  }

  getItemAreaSelectorById(entityId: number) {
    return `${this.getItemSelectorById(entityId)} .item-area`
  }

  getTreeSelectorByLabel(label: string) {
    return `.Hierarchy .Tree[data-test-label="${label}"]`
  }

  async toggleOpen(entityId: number) {
    const arrowSelector = (entityId: number) => `${this.getItemAreaSelectorById(entityId)} > svg`
    const arrow = await this.getItem(entityId, arrowSelector)
    await arrow.click()
  }

  async getItem(entityId: number, selector: (entityId: number) => string) {
    const item = await page.$(selector(entityId))
    if (!item) {
      throw new Error(`Could not find entity with id=${entityId}`)
    }
    return item
  }

  async getId(label: string) {
    const id = await page.$eval(this.getTreeSelectorByLabel(label), (element) => element.getAttribute('data-test-id'))
    if (!id) {
      throw new Error(`Could not find entity with label="${label}"`)
    }
    return +id
  }

  async getChildrenIds(parent: number, selector: string) {
    const parentNode = await this.getItem(parent, this.getParentSelectorById)
    const ids = await parentNode.$$eval(selector, (elements) => {
      return elements.map(($) => +($.getAttribute('data-test-id') || NaN))
    })
    return ids
  }

  async setParent(entityId: number, parent: number, positions: Positions = { x: 'inside', y: 'inside' }) {
    await dragAndDrop(this.getItemAreaSelectorById(entityId), this.getItemAreaSelectorById(parent), positions)
  }

  async isAncestor(entityId: number, parent: number) {
    const item = await page.$(
      `${this.getParentSelectorById(parent)} ${this.getItemSelectorById(entityId).replace('.Hierarchy', '')}`
    )
    return item !== null
  }

  async hasChildrenInOrder(parent: number, ...childrenIds: number[]) {
    const ids = await this.getChildrenIds(parent, '.Tree')
    if (ids.length !== childrenIds.length) return false
    for (let i = 0; i < ids.length; i++) {
      if (ids[i] !== childrenIds[i]) return false
    }
    return true
  }

  async getLabel(entityId: number) {
    const item = await this.getItem(entityId, this.getItemSelectorById)
    const label = await item.evaluate((el) => el.textContent)
    return label || ''
  }

  async rename(entityId: number, newLabel: string) {
    const item = await this.getItem(entityId, this.getItemSelectorById)
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

  async addChild(entityId: number, label: string) {
    const item = await this.getItem(entityId, this.getItemSelectorById)
    try {
      await item.click({ button: 'right' })
    } catch (error: any) {
      throw new Error(`Could not click on item entityId=${entityId} and label="${label}": ${error.message}`)
    }
    const addChild = await item.$('.contexify_item[itemid="add-child"')
    if (!addChild) {
      throw new Error(`Can't add child to entity with id=${entityId}`)
    }
    await addChild.click()
    await page.keyboard.type(label)
    await page.keyboard.press('Enter')
  }

  async duplicate(entityId: number) {
    const item = await this.getItem(entityId, this.getItemSelectorById)
    await item.click({ button: 'right' })
    const duplicate = await item.$('.contexify_item[itemid="duplicate"')
    if (!duplicate) {
      throw new Error(`Can't duplicate entity with id=${entityId}`)
    }
    await duplicate.click()
  }

  async remove(entityId: number) {
    const item = await this.getItem(entityId, this.getItemSelectorById)
    await item.click({ button: 'right' })
    const remove = await item.$('.contexify_item[itemid="delete"')
    if (!remove) {
      throw new Error(`Can't delete entity with id=${entityId}`)
    }
    await remove.click()
  }

  async exists(entityId: number) {
    try {
      await this.getItem(entityId, this.getItemSelectorById)
      return true
    } catch (error) {
      return false
    }
  }

  async addComponent(entityId: number, componentName: string) {
    const item = await this.getItem(entityId, this.getItemSelectorById)
    await item.click({ button: 'right' })
    const addComponent = await item.$('.contexify_item[itemid="add-component"')
    if (!addComponent) {
      throw new Error(`Can't add components on entity with id=${entityId}`)
    }
    await addComponent.click()
    const component = await addComponent.$(`.contexify_item[itemid="${componentName}"`)
    if (!component) {
      throw new Error(`Can't add component with componentName=${componentName} on entity with id=${entityId}`)
    }
    await component.click()
  }
}

export const Hierarchy = new HierarchyPageObject()
