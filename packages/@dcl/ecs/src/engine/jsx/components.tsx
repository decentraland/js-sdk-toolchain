import { DivProps, TextProps } from './types'

/**
 * @public
 */
export function DivUi(
  props: Partial<DivProps> & { key?: string | number }
): JSX.Element {
  return <divui {...props} />
}

/**
 * @public
 */
export function TextUi({ ...props }: TextProps) {
  return <textui {...props} />
}
