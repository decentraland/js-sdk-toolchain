import { ReactEcs } from '../../react-ecs'
import { DivProps } from './types'

export * from './types'

/**
 * @public
 */
export function DivUi(props: Partial<DivProps> & { key?: string | number }) {
  return <divui {...props} />
}
