import EcsJsx from '.'

import { DivProps, JsxTree, TextProps } from './types'

/**
 * @public
 */
export function DivUi(props: Partial<DivProps>, ...children: Node[]): JsxTree {
  return <divui {...props}>{...children}</divui>
}

/**
 * @public
 */
export function TextUi(props: TextProps, ...children: Node[]): JsxTree {
  return <textui {...props}>{...children}</textui>
}
