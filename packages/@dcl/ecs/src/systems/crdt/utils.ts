import { ComponentDefinition } from '../../engine/component'
import { Entity } from '../../engine/entity'

export namespace CrdtUtils {
  export type ComponentID = ComponentDefinition['_id']

  // TODO: use this again
  // export function parseKey(key: string): [Entity, ComponentID] {
  //   const [entity, componentId] = key.split('.').map(Number) as [
  //     Entity,
  //     ComponentID
  //   ]
  //   return [entity, componentId]
  // }

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

// TODO: next version split between diff types of transports/crdts.
// 1. engine.receiveMessage(rawMessage "diff")
// 2. engine checks CRDT "filter"
//   2.1. If pass, then apply CRDT message to internal cache
//   2.2. Update registered components "patch" (using rawMessage data & created components)
//   2.3. Execute onUpdate callbacks "emit"

// engine.onUpdate((rawMessage) => {
//   rawMessage // { entity_id, data, com, time}
//   if (component.meta.syncFlags & SynchronizedEntityType.ALL || component.meta.syncFlags & SynchronizedEntityType.RENDERER) {
//     SENDTORENDERER()
//   }
// })

// async function sendUpdates(message: crdt.Message) {
//   return
// }

// function rendererStream() {
//   const componentIds = getComponentIds()

//   function filter(componentId: number) {
//     return componentIds.includes(componentId)
//   }

//   function send() {
//     console.log('send')
//   }

//   return { filter, send }
// }

// function sceneStream() {
//   function filter(componentId: number) {}
// }
