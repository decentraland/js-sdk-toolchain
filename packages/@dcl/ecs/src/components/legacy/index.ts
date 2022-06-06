import type { IEngine } from '../../engine/types'
import { defineProtocolBufferComponents } from '../generated/index'
import { Transform as LegacyTransform } from './Transform'
import { LEGACY_COMPONENT_ID as ID } from './types'

export function defineLegacyComponents({
  defineComponent
}: Pick<IEngine, 'defineComponent'>) {
  return {
    Transform: defineComponent(ID.TRANSFORM, LegacyTransform),
    ...defineProtocolBufferComponents({ defineComponent })
  }
}
