import * as components from '../components'
import { Schemas } from '../schemas'
import { ISchema } from '../schemas/ISchema'
import { Result, Spec } from '../schemas/Map'
import { ByteBuffer } from '../serialization/ByteBuffer'
import { crdtSceneSystem } from '../systems/crdt'
import {
  ComponentDefinition,
  ComponentType,
  defineComponent as defComponent
} from './component'
import { Entity, EntityContainer } from './entity'
import { SystemContainer, SYSTEMS_REGULAR_PRIORITY, SystemFn } from './systems'
import type { IEngine } from './types'
export * from './input'
import { ReadonlyComponentSchema } from './readonly'

export * from './readonly'
export * from './types'
export { ComponentType, Entity, ByteBuffer, ComponentDefinition }

function preEngine() {
  const entityContainer = EntityContainer()
  const componentsDefinition = new Map<
    number,
    ComponentDefinition<ISchema<unknown>, unknown>
  >()
  const systems = SystemContainer()

  function addSystem(
    fn: SystemFn,
    priority: number = SYSTEMS_REGULAR_PRIORITY,
    name?: string
  ) {
    systems.add(fn, priority, name)
  }

  function removeSystem(selector: string | SystemFn) {
    return systems.remove(selector)
  }

  function addEntity(dynamic: boolean = false) {
    // entitiesCompnonent.set(entity, new Set())
    const entity = entityContainer.generateEntity(dynamic)
    return entity
  }

  function entityExists(entity: Entity) {
    return entityContainer.entityExists(entity)
  }

  function addDynamicEntity() {
    return addEntity(true)
  }

  function removeEntity(entity: Entity) {
    for (const [, component] of componentsDefinition) {
      if (component.has(entity)) {
        component.deleteFrom(entity)
      }
    }

    return entityContainer.removeEntity(entity)
  }

  function defineComponentFromSchema<
    T extends ISchema<ConstructorType>,
    ConstructorType = ComponentType<T>
  >(
    spec: T,
    componentId: number,
    constructorDefault?: ConstructorType
  ): ComponentDefinition<T, ConstructorType> {
    const prev = componentsDefinition.get(componentId)
    if (prev) {
      // TODO: assert spec === prev.spec
      return prev
    }
    const newComponent = defComponent<T, ConstructorType>(
      componentId,
      spec,
      constructorDefault
    )
    componentsDefinition.set(componentId, newComponent)
    return newComponent
  }

  function defineComponent<
    T extends Spec,
    ConstructorType = Partial<Result<T>>
  >(
    spec: T,
    componentId: number,
    constructorDefault?: ConstructorType
  ): ComponentDefinition<ISchema<ConstructorType>> {
    return defineComponentFromSchema(
      Schemas.Map(spec) as ISchema<ConstructorType>,
      componentId,
      constructorDefault
    )
  }

  function getComponent<T extends ISchema<V>, V>(
    componentId: number
  ): ComponentDefinition<T, V> {
    const component = componentsDefinition.get(componentId)
    if (!component) {
      throw new Error(
        `Component ${componentId} not found. You need to declare the components at the beginnig of the engine declaration`
      )
    }
    return component
  }

  function getComponentOrNull<T extends ISchema<V>, V>(
    componentId: number
  ): ComponentDefinition<T, V> | null {
    return (
      componentsDefinition.get(componentId) ??
      /* istanbul ignore next */
      null
    )
  }

  function* getEntitiesWith<
    T extends [
      ComponentDefinition<any, any>,
      ...ComponentDefinition<any, any>[]
    ]
  >(...components: T): Iterable<[Entity, ...ReadonlyComponentSchema<T>]> {
    for (const [entity, ...groupComp] of getComponentDefGroup(...components)) {
      yield [entity, ...groupComp.map((c) => c.get(entity))] as [
        Entity,
        ...ReadonlyComponentSchema<T>
      ]
    }
  }

  function* getComponentDefGroup<T extends ComponentDefinition<any, any>[]>(
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

  function getSystems() {
    return systems.getSystems()
  }

  function removeComponentDefinition(componentId: number) {
    componentsDefinition.delete(componentId)
  }

  return {
    entityExists,
    componentsDefinition,
    addEntity,
    addDynamicEntity,
    removeEntity,
    addSystem,
    getSystems,
    removeSystem,
    defineComponent,
    defineComponentFromSchema,
    getEntitiesWith,
    getComponent,
    getComponentOrNull,
    removeComponentDefinition
  }
}

/**
 * @public
 */
export function Engine(): IEngine {
  const engine = preEngine()
  const crdtSystem = crdtSceneSystem(engine)

  function update(dt: number) {
    crdtSystem.receiveMessages()

    for (const system of engine.getSystems()) {
      const ret: any = system.fn(dt)
      if ((globalThis as any).DEBUG) {
        if (ret && typeof ret === 'object' && typeof ret.then === 'function') {
          throw new Error(
            `A system (${
              system.name || 'anonymous'
            }) returned a thenable. Systems cannot be async functions. Documentation: https://dcl.gg/sdk/sync-systems`
          )
        }
      }
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

  const Transform = components.Transform(engine)

  function* getTreeEntityArray(
    firstEntity: Entity,
    proccesedEntities: Entity[]
  ): Generator<Entity> {
    // This avoid infinite loop when there is a cyclic parenting
    if (proccesedEntities.find((value) => firstEntity === value)) return
    proccesedEntities.push(firstEntity)

    for (const [entity, value] of engine.getEntitiesWith(Transform)) {
      if (value.parent === firstEntity) {
        yield* getTreeEntityArray(entity, proccesedEntities)
      }
    }

    yield firstEntity
  }

  function removeEntityWithChildren(firstEntity: Entity) {
    for (const entity of getTreeEntityArray(firstEntity, [])) {
      engine.removeEntity(entity)
    }
  }

  return {
    addEntity: engine.addEntity,
    addDynamicEntity: engine.addDynamicEntity,
    removeEntity: engine.removeEntity,
    removeEntityWithChildren,
    addSystem: engine.addSystem,
    removeSystem: engine.removeSystem,
    // TODO: fix this type
    defineComponent: engine.defineComponent as any,
    defineComponentFromSchema: engine.defineComponentFromSchema,
    getEntitiesWith: engine.getEntitiesWith,
    getComponent: engine.getComponent,
    getComponentOrNull: engine.getComponentOrNull,
    removeComponentDefinition: engine.removeComponentDefinition,
    update,
    RootEntity: 0 as Entity,
    PlayerEntity: 1 as Entity,
    CameraEntity: 2 as Entity,
    entityExists: engine.entityExists,
    addTransport: crdtSystem.addTransport
  }
}
