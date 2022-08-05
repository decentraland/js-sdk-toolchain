import { IEngine } from '../types'
import { JsxTree } from './types'
import { CANVAS_ROOT_ENTITY, defaultDiv } from './utils'

/**
 * @public
 */
export namespace EcsJsx {
  export function createElement(
    tag: JsxTree['tag'] | ((attributes: any, children: any) => JsxTree),
    attributes: { [key: string]: any } | null,
    ...args: any[]
  ): JsxTree {
    const children: any[] | null = args.length ? [].concat(...args) : null

    if (typeof tag === 'function') {
      return tag(attributes ?? {}, children ?? undefined)
    }

    return { tag, attributes, children } as JsxTree
  }
}

export function render(engine: Pick<IEngine, 'baseComponents' | 'addEntity'>) {
  const { UiTransform, UiText } = engine.baseComponents

  /**
   * For now we create a _static_ tree.
   * NO updates.
   */
  return function createStaticTree(
    jsx: JsxTree,
    parent: number = CANVAS_ROOT_ENTITY,
    order: number = 0
  ) {
    const { tag, children, attributes } = jsx
    const entity = engine.addEntity()

    if (tag === 'textui') {
      UiText.create(entity, {
        text: attributes.value,
        textColor: { r: 0, g: 0, b: 0 }
      })
      UiTransform.create(entity, { ...defaultDiv, parent })
      console.log(
        `<Div parent=${parent} entity=${entity} order=${order}><Text /></Div>`
      )
    } else if (tag === 'divui') {
      UiTransform.create(entity, {
        ...defaultDiv,
        ...attributes,
        parent
        // order,
      })
      console.log(`<Div parent=${parent} entity=${entity} order=${order} />`)
    }

    for (const [index, child] of children.entries()) {
      if (child) {
        createStaticTree(child, entity, index)
      }
    }
  }
}

export default EcsJsx
