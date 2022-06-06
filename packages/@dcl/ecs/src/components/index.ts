import { defineLegacyComponents } from './legacy'
import type { IEngine } from '../engine/types'

export * from './types'

export function defineSdkComponents(engine: Pick<IEngine, 'defineComponent'>) {
  return {
    ...defineLegacyComponents(engine)
  }
}

/**
 * @public
 */
export type SdkComponetns = ReturnType<typeof defineSdkComponents>
