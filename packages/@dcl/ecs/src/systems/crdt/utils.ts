import { ComponentDefinition } from '../../engine/component'

export namespace CrdtUtils {
  export type ComponentID = ComponentDefinition<any>['componentId']

  export enum SynchronizedEntityType {
    // synchronizes entities with the NetworkSynchronized component only, used for networked games
    NETWORKED,
    // synchronizes entities needed by the renderer
    RENDERER
  }
}

export default CrdtUtils
