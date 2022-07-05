import EcsJsx from './renderer'

import { DivProps, JsxTree, TextProps } from './types'

/**
 * @public
 */
export function DivUi(props: Partial<DivProps>, ...children: any[]): JsxTree {
  return <divui {...props}>{...children}</divui>
}

/**
 * @public
 */
export function TextUi(props: TextProps, ...children: any[]): JsxTree {
  return <textui {...props}>{...children}</textui>
}
