import { IEngine } from '../../src/engine'
import { JsxTree } from './types'
import { defaultDiv } from './utils'

export { DivUi, TextUi } from './components'

export function ecsJsx(
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

export function render(engine: IEngine) {
  const { UiTransform, UiText } = engine.baseComponents

  /**
   * For now we create a _static_ tree.
   * NO updates.
   */
  return function createStaticTree(
    jsx: JsxTree,
    parent: number = 0,
    order: number = 0
  ) {
    const { tag, children, attributes } = jsx
    const entity = engine.addEntity()

    if (tag === 'textui') {
      UiText.create(entity, { text: attributes.value })
      UiTransform.create(entity, { ...defaultDiv, parent })
      console.log(
        `<Div parent=${parent} entity=${entity} order=${order}><Text /></Div>`
      )
    } else if (tag === 'divui') {
      UiTransform.create(entity, {
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

export default ecsJsx
