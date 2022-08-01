/*
 * @jsx ecsJsx
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import ecsJsx from '.'

import { DivProps, JsxTree, TextProps } from './types'

export function DivUi(props: Partial<DivProps>, ...children: Node[]): JsxTree {
  return <divui {...props}>{...children}</divui>
}

export function TextUi(props: TextProps, ...children: Node[]): JsxTree {
  return <textui {...props}>{...children}</textui>
}
