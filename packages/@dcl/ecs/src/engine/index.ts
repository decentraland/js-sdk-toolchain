import * as components from '../components'
import { checkNotThenable } from '../runtime/invariant'
import { Schemas } from '../schemas'
import { ISchema } from '../schemas/ISchema'
import { MapResult, Spec } from '../schemas/Map'
import { ByteBuffer } from '../serialization/ByteBuffer'
import { crdtSceneSystem, OnChangeFunction } from '../systems/crdt'
import {
  ComponentDefinition,
  defineComponent as defComponent
} from './component'
import { Entity, EntityContainer } from './entity'
import { ReadonlyComponentSchema } from './readonly'
import {
  SystemItem,
  SystemContainer,
  SystemFn,
  SYSTEMS_REGULAR_PRIORITY
} from './systems'
import type { IEngine, MapComponentDefinition } from './types'
export * from './input'
export * from './readonly'
export * from './types'
export { Entity, ByteBuffer, ComponentDefinition, SystemItem, OnChangeFunction }

type PreEngine = Pick<
  IEngine,
  | 'addEntity'
  | 'removeEntity'
  | 'removeEntityWithChildren'
  | 'addSystem'
  | 'removeSystem'
  | 'defineComponent'
  | 'defineComponentFromSchema'
  | 'registerCustomComponent'
  | 'getEntitiesWith'
  | 'getComponent'
  | 'getComponentOrNull'
  | 'removeComponentDefinition'
  | 'componentsDefinition'
  | 'entityContainer'
  | 'componentsIter'
> & {
  getSystems: () => SystemItem[]
}

function preEngine(): PreEngine {
  const entityContainer = EntityContainer()
  const componentsDefinition = new Map<number, ComponentDefinition<unknown>>()
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

  function addEntity() {
    const entity = entityContainer.generateEntity()
    return entity
  }

  function removeEntity(entity: Entity) {
    for (const [, component] of componentsDefinition) {
      if (component.has(entity)) {
        component.deleteFrom(entity)
      }
    }

    return entityContainer.removeEntity(entity)
  }

  function registerCustomComponent(
    component: ComponentDefinition<any>,
    componentId: number
  ): ComponentDefinition<any> {
    const prev = componentsDefinition.get(componentId)
    if (prev) {
      throw new Error(`Component number ${componentId} was already registered.`)
    }
    componentsDefinition.set(componentId, component)
    return component
  }

  function defineComponentFromSchema<T>(spec: ISchema<T>, componentId: number) {
    const prev = componentsDefinition.get(componentId)
    if (prev) {
      // TODO: assert spec === prev.spec
      return prev as ComponentDefinition<T>
    }
    const newComponent = defComponent<T>(componentId, spec)
    componentsDefinition.set(componentId, newComponent)
    return newComponent as ComponentDefinition<T>
  }

  function defineComponent<T extends Spec>(
    mapSpec: T,
    componentId: number,
    constructorDefault?: Partial<MapResult<T>>
  ) {
    const prev = componentsDefinition.get(componentId)
    if (prev) {
      // TODO: assert spec === prev.spec
      return prev as MapComponentDefinition<MapResult<T>>
    }

    const schemaSpec = Schemas.Map(mapSpec, constructorDefault)
    const def = defComponent<MapResult<T>>(componentId, schemaSpec)
    const newComponent = {
      ...def,
      create(entity: Entity, val?: Partial<MapResult<T>>) {
        return def.create(entity, val as any)
      },
      createOrReplace(entity: Entity, val?: Partial<MapResult<T>>) {
        return def.createOrReplace(entity, val as any)
      }
    }

    componentsDefinition.set(componentId, newComponent)
    return newComponent as MapComponentDefinition<MapResult<T>>
  }

  function getComponent<T>(componentId: number): ComponentDefinition<T> {
    const component = componentsDefinition.get(componentId)
    if (!component) {
      throw new Error(
        `Component ${componentId} not found. You need to declare the components at the beginnig of the engine declaration`
      )
    }
    return component as ComponentDefinition<T>
  }

  function getComponentOrNull<T>(
    componentId: number
  ): ComponentDefinition<T> | null {
    return (
      (componentsDefinition.get(componentId) as ComponentDefinition<T>) ??
      /* istanbul ignore next */
      null
    )
  }

  function* getEntitiesWith<
    T extends [ComponentDefinition<any>, ...ComponentDefinition<any>[]]
  >(...components: T): Iterable<[Entity, ...ReadonlyComponentSchema<T>]> {
    for (const [entity, ...groupComp] of getComponentDefGroup(...components)) {
      yield [entity, ...groupComp.map((c) => c.get(entity))] as [
        Entity,
        ...ReadonlyComponentSchema<T>
      ]
    }
  }

  function* getComponentDefGroup<T extends ComponentDefinition<any>[]>(
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

  function componentsIter() {
    return componentsDefinition.values()
  }

  function removeComponentDefinition(componentId: number) {
    componentsDefinition.delete(componentId)
  }

  const Transform = components.Transform({ defineComponentFromSchema })

  function* getTreeEntityArray(
    firstEntity: Entity,
    proccesedEntities: Entity[]
  ): Generator<Entity> {
    // This avoid infinite loop when there is a cyclic parenting
    if (proccesedEntities.find((value) => firstEntity === value)) return
    proccesedEntities.push(firstEntity)

    for (const [entity, value] of getEntitiesWith(Transform)) {
      if (value.parent === firstEntity) {
        yield* getTreeEntityArray(entity, proccesedEntities)
      }
    }

    yield firstEntity
  }

  function removeEntityWithChildren(firstEntity: Entity) {
    for (const entity of getTreeEntityArray(firstEntity, [])) {
      removeEntity(entity)
    }
  }
  return {
    componentsDefinition,
    addEntity,
    removeEntity,
    addSystem,
    getSystems,
    removeSystem,
    defineComponent,
    defineComponentFromSchema,
    getEntitiesWith,
    getComponent,
    getComponentOrNull,
    removeComponentDefinition,
    removeEntityWithChildren,
    registerCustomComponent,
    entityContainer,
    componentsIter
  }
}

/**
 * @public
 */
export type IEngineOptions = {
  onChangeFunction: OnChangeFunction
}

/**
 * @public
 */
export function Engine(options?: IEngineOptions): IEngine {
  const engine = preEngine()
  const crdtSystem = crdtSceneSystem(engine, options?.onChangeFunction || null)

  async function update(dt: number) {
    await crdtSystem.receiveMessages()
    for (const system of engine.getSystems()) {
      const ret: unknown | Promise<unknown> = system.fn(dt)
      checkNotThenable(
        ret,
        `A system (${system.name || 'anonymous'
        }) returned a thenable. Systems cannot be async functions. Documentation: https://dcl.gg/sdk/sync-systems`
      )
    }
    const dirtyEntities = crdtSystem.updateState()
    const deletedEntites = engine.entityContainer.releaseRemovedEntities()
    await crdtSystem.sendMessages(dirtyEntities, deletedEntites)

    for (const [_componentId, definition] of engine.componentsDefinition) {
      definition.clearDirty()
    }
  }

  return {
    addEntity: engine.addEntity,
    removeEntity: engine.removeEntity,
    removeEntityWithChildren: engine.removeEntityWithChildren,
    addSystem: engine.addSystem,
    removeSystem: engine.removeSystem,
    defineComponent: engine.defineComponent,
    defineComponentFromSchema: engine.defineComponentFromSchema,
    registerCustomComponent: engine.registerCustomComponent,
    getEntitiesWith: engine.getEntitiesWith,
    getComponent: engine.getComponent,
    getComponentOrNull: engine.getComponentOrNull,
    removeComponentDefinition: engine.removeComponentDefinition,
    componentsIter: engine.componentsIter,
    update,

    RootEntity: 0 as Entity,
    PlayerEntity: 1 as Entity,
    CameraEntity: 2 as Entity,

    getEntityState: engine.entityContainer.getEntityState,
    addTransport: crdtSystem.addTransport,
    getCrdtState: crdtSystem.getCrdt,

    componentsDefinition: engine.componentsDefinition,
    entityContainer: engine.entityContainer
  }
}
