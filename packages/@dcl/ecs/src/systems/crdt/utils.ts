import { ComponentDefinition } from '../../engine/component'
import { Entity } from '../../engine/entity'

export namespace CrdtUtils {
  export type ComponentID = ComponentDefinition['_id']

  export function getKey(entity: Entity, componentId: ComponentID): string {
    return `${entity}.${componentId}`
  }

  export enum SynchronizedEntityType {
    // synchronizes entities with the NetworkSynchronized component only, used for networked games
    NETWORKED,
    // synchronizes entities needed by the renderer
    RENDERER
  }
}

export default CrdtUtils
