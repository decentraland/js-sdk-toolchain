import EcsJsx from './renderer'

import { DivProps, TextProps } from './types'

/**
 * @public
 */
export function DivUi(props: Partial<DivProps>) {
  return <divui {...props} />
}

/**
 * @public
 */
// export function TextUi({ ...props }: TextProps) {
//   return <textui {...props} />
// }
