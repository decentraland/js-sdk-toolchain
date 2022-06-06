import { defineSdkComponents, SdkComponetns } from '../components'
import { crdtSceneSystem } from '../systems/crdt'
import { Entity, EntityContainer } from './entity'
import {
  ComponentType,
  ComponentDefinition,
  defineComponent as defComponent
} from './component'
import type { ComponentEcsType, Update } from './types'
import type { DeepReadonly } from '../Math'
import type { EcsType } from '../built-in-types/EcsType'
import { IEngine } from './types'
import { ByteBuffer } from '../serialization/ByteBuffer'

export { ComponentType, Entity, ByteBuffer, SdkComponetns, ComponentDefinition }
export * from './types'

function preEngine() {
  const entityContainer = EntityContainer()
  const componentsDefinition = new Map<number, ComponentDefinition<any>>()
  // TODO: find a way to make this work.
  // Maybe a proxy/callback to be up-to-date
  const entitiesComponent = new Map<
    number,
    Set<ComponentDefinition<any>['_id']>
  >()
  const systems = new Set<Update>()

  function addSystem(fn: Update) {
    if (systems.has(fn)) {
      throw new Error('System already added')
    }
    systems.add(fn)
  }

  function addEntity(dynamic: boolean = false) {
    // entitiesCompnonent.set(entity, new Set())
    const entity = entityContainer.generateEntity(dynamic)
    return entity
  }

  function addDynamicEntity() {
    return addEntity(true)
  }

  function removeEntity(entity: Entity) {
    // TODO: Remove all the components of that entity
    for (const [, component] of componentsDefinition) {
      if (component.has(entity)) {
        component.deleteFrom(entity)
      }
    }
    // entitiesComponent.delete(entity)
    return entityContainer.removeEntity(entity)
  }

  function defineComponent<T extends EcsType>(
    componentId: number,
    spec: T
  ): ComponentDefinition<T> {
    if (componentsDefinition.get(componentId)) {
      throw new Error(`Component ${componentId} already declared`)
    }
    const newComponent = defComponent<T>(componentId, spec)
    componentsDefinition.set(componentId, newComponent)
    return newComponent
  }

  function getComponent<T extends EcsType>(
    componentId: number
  ): ComponentDefinition<T> {
    const component = componentsDefinition.get(componentId)
    if (!component) {
      throw new Error(
        'Component not found. You need to declare the components at the beginnig of the engine declaration'
      )
    }
    return component
  }

  function* mutableGroupOf<
    T extends [ComponentDefinition, ...ComponentDefinition[]]
  >(...components: T): Iterable<[Entity, ...ComponentEcsType<T>]> {
    for (const [entity, ...groupComp] of getComponentDefGroup(...components)) {
      yield [entity, ...groupComp.map((c) => c.mutable(entity))] as [
        Entity,
        ...ComponentEcsType<T>
      ]
    }
  }

  function* groupOf<T extends [ComponentDefinition, ...ComponentDefinition[]]>(
    ...components: T
  ): Iterable<[Entity, ...DeepReadonly<ComponentEcsType<T>>]> {
    for (const [entity, ...groupComp] of getComponentDefGroup(...components)) {
      yield [entity, ...groupComp.map((c) => c.getFrom(entity))] as [
        Entity,
        ...DeepReadonly<ComponentEcsType<T>>
      ]
    }
  }

  function* getComponentDefGroup<T extends ComponentDefinition[]>(
    ...args: T
  ): Iterable<[Entity, ...T]> {
    const [firstComponentDef, ...componentDefinitions] = args
    for (const [entity] of firstComponentDef.iterator()) {
      let matches = true
      for (const componentDef of componentDefinitions) {
        if (!componentDef.has(entity)) {
          matches = false
          break
        }
      }

      if (matches) {
        yield [entity, ...args]
      }
    }
  }

  return {
    entitiesComponent,
    componentsDefinition,
    systems,
    addEntity,
    addDynamicEntity,
    removeEntity,
    addSystem,
    defineComponent,
    mutableGroupOf,
    groupOf,
    getComponent
  }
}

/**
 * @internal
 */
export type PreEngine = ReturnType<typeof preEngine>

/**
 * @public
 */
export function Engine(): IEngine {
  const engine = preEngine()
  const crdtSystem = crdtSceneSystem(engine)
  const baseComponents = defineSdkComponents(engine)

  function update(dt: number) {
    crdtSystem.receiveMessages()

    for (const system of engine.systems) {
      system(dt)
    }

    // TODO: Perf tip
    // Should we add some dirtyIteratorSet at engine level so we dont have
    // to iterate all the component definitions to get the dirty ones ?
    const dirtySet = new Map<Entity, Set<number>>()
    for (const [componentId, definition] of engine.componentsDefinition) {
      for (const entity of definition.dirtyIterator()) {
        if (!dirtySet.has(entity)) {
          dirtySet.set(entity, new Set())
        }
        dirtySet.get(entity)!.add(componentId)
      }
    }
    crdtSystem.createMessages(dirtySet)

    for (const [_componentId, definition] of engine.componentsDefinition) {
      definition.clearDirty()
    }
  }

  return {
    addEntity: engine.addEntity,
    addDynamicEntity: engine.addDynamicEntity,
    removeEntity: engine.removeEntity,
    addSystem: engine.addSystem,
    defineComponent: engine.defineComponent,
    mutableGroupOf: engine.mutableGroupOf,
    groupOf: engine.groupOf,
    getComponent: engine.getComponent,
    update,
    baseComponents
  }
}
