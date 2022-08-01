/*
 * @jsx jsx
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import jsx from '.'

import { DivProps } from './types'
import { YGDisplay } from '../../src/components/generated/pb/UiTransform.gen'
import { Entity, IEngine } from '../../src/engine'

interface TextProps {
  id?: string
  value: string
}

function DivUi(props: Partial<DivProps>, ...children: Node[]) {
  return <divui {...props}>{...children}</divui>
}

function TextUi(props: TextProps, ...children: Node[]) {
  return <textui {...props}>{...children}</textui>
}

type DivTag = {
  tag: 'divui'
  attributes: DivProps
}
type TextTag = {
  tag: 'textui'
  attributes: TextProps
}
type JsxTree = (DivTag | TextTag) & {
  children: (JsxTree | null)[]
}
type Tree = JsxTree & {
  _id: number
  entityId: Entity | number
}

const defaultDiv: DivProps = {} as any as DivProps
let _oldTree: Tree

export function render(engine: IEngine) {
  const { UiTransform, UiText } = engine.baseComponents

  /**
   * For now we create a static tree.
   * NO updates.
   */
  return function createStaticTree(
    jsx: JsxTree,
    parent: number = 0,
    // TODO: order
    _order?: number
  ) {
    const { tag, children, attributes } = jsx
    const entity = engine.addEntity()
    if (tag === 'textui') {
      UiText.create(entity, { text: attributes.value })
      UiTransform.create(entity, { ...defaultDiv, parent })
    } else if (tag === 'divui') {
      UiTransform.create(entity, {
        ...attributes,
        parent
        // order,
      })
    }
    for (const [index, child] of children.entries()) {
      if (child) {
        createStaticTree(child, entity, index)
      }
    }
  }
}

export const ui = () => (
  <DivUi display={YGDisplay.YGDisplayFlex}>
    <DivUi>
      <TextUi value="Ecs 17" />
      <TextUi value="Ecs 117" />
    </DivUi>
  </DivUi>
)
