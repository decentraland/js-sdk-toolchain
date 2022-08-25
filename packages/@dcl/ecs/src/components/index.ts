import { IEngine } from '../engine/types'

import { defineLibraryComponents } from './generated/index.gen'
import { defineTransformComponent } from './legacy/Transform'

export enum COMPONENT_ID {
  SYNC = 1000
}

/**
 * @public
 */
export type SdkComponents = ReturnType<typeof defineSdkComponents>

export function defineSdkComponents({
  defineComponentFromSchema
}: Pick<IEngine, 'defineComponentFromSchema'>) {
  return {
    ...defineLibraryComponents({ defineComponentFromSchema }),
    Transform: defineTransformComponent({ defineComponentFromSchema })
  }
}
