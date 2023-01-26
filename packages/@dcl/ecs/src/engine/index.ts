import * as components from '../components'
import { componentNumberFromName } from '../components/component-number'
import { checkNotThenable } from '../runtime/invariant'
import { Schemas } from '../schemas'
import { ISchema } from '../schemas/ISchema'
import { MapResult, Spec } from '../schemas/Map'
import { ByteBuffer } from '../serialization/ByteBuffer'
import { crdtSceneSystem, OnChangeFunction } from '../systems/crdt'
import { ComponentDefinition, createComponentDefinitionFromSchema } from './component'
import { Entity, EntityContainer } from './entity'
import { ReadonlyComponentSchema } from './readonly'
import { SystemItem, SystemContainer, SystemFn, SYSTEMS_REGULAR_PRIORITY } from './systems'
import type { IEngine, IEngineOptions, MapComponentDefinition, PreEngine } from './types'
export * from './input'
export * from './readonly'
export * from './types'
export { Entity, ByteBuffer, ComponentDefinition, SystemItem, OnChangeFunction }

function preEngine(): PreEngine {
  const entityContainer = EntityContainer()
  const componentsDefinition = new Map<number, ComponentDefinition<unknown>>()
  const systems = SystemContainer()

  let sealed = false

  function addSystem(fn: SystemFn, priority: number = SYSTEMS_REGULAR_PRIORITY, name?: string) {
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

  function registerComponentDefinition(
    componentName: string,
    component: ComponentDefinition<any>
  ): ComponentDefinition<any> {
    /* istanbul ignore next */
    if (sealed) throw new Error('Engine is already sealed. No components can be added at this stage')
    const componentId = componentNumberFromName(componentName)
    const prev = componentsDefinition.get(componentId)
    if (prev) {
      throw new Error(`Component number ${componentId} was already registered.`)
    }
    /* istanbul ignore next */
    if (component.componentName !== componentName) {
      throw new Error(
        `Component name doesn't match componentDefinition.componentName ${componentName} != ${component.componentName}`
      )
    }
    /* istanbul ignore next */
    if (component.componentId !== componentId) {
      throw new Error(
        `Component number doesn't match componentDefinition.componentId ${componentId} != ${component.componentId}`
      )
    }
    componentsDefinition.set(componentId, component)
    return component
  }

  function defineComponentFromSchema<T>(componentName: string, schema: ISchema<T>) {
    /* istanbul ignore next */
    if (sealed) throw new Error('Engine is already sealed. No components can be added at this stage')
    const componentId = componentNumberFromName(componentName)
    const prev = componentsDefinition.get(componentId)
    if (prev) {
      // TODO: assert spec === prev.spec
      return prev as ComponentDefinition<T>
    }
    const newComponent = createComponentDefinitionFromSchema<T>(componentName, componentId, schema)
    componentsDefinition.set(componentId, newComponent)
    return newComponent as ComponentDefinition<T>
  }

  function defineComponent<T extends Spec>(
    componentName: string,
    mapSpec: T,
    constructorDefault?: Partial<MapResult<T>>
  ) {
    if (sealed) throw new Error('Engine is already sealed. No components can be added at this stage')
    const componentId = componentNumberFromName(componentName)
    const prev = componentsDefinition.get(componentId)
    if (prev) {
      // TODO: assert spec === prev.spec
      return prev as MapComponentDefinition<MapResult<T>>
    }

    const schemaSpec = Schemas.Map(mapSpec, constructorDefault)
    const def = createComponentDefinitionFromSchema<MapResult<T>>(componentName, componentId, schemaSpec)
    const newComponent: MapComponentDefinition<MapResult<T>> = {
      ...def,
      create(entity: Entity, val?: Partial<MapResult<T>>) {
        return def.create(entity, val as any)
      },
      createOrReplace(entity: Entity, val?: Partial<MapResult<T>>) {
        return def.createOrReplace(entity, val as any)
      }
    }

    componentsDefinition.set(componentId, newComponent)
    return newComponent
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

  function getComponentOrNull<T>(componentId: number): ComponentDefinition<T> | null {
    return (
      (componentsDefinition.get(componentId) as ComponentDefinition<T>) ??
      /* istanbul ignore next */
      null
    )
  }

  function* getEntitiesWith<T extends [ComponentDefinition<any>, ...ComponentDefinition<any>[]]>(
    ...components: T
  ): Iterable<[Entity, ...ReadonlyComponentSchema<T>]> {
    for (const [entity, ...groupComp] of getComponentDefGroup(...components)) {
      yield [entity, ...groupComp.map((c) => c.get(entity))] as [Entity, ...ReadonlyComponentSchema<T>]
    }
  }

  function* getComponentDefGroup<T extends ComponentDefinition<any>[]>(...args: T): Iterable<[Entity, ...T]> {
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

  function* getTreeEntityArray(firstEntity: Entity, proccesedEntities: Entity[]): Generator<Entity> {
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

  function seal() {
    if (!sealed) {
      sealed = true
    }
  }

  return {
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
    registerComponentDefinition,
    entityContainer,
    componentsIter,
    seal
  }
}

/**
 * @internal
 */
export function Engine(options?: IEngineOptions): IEngine {
  const partialEngine = preEngine()
  const crdtSystem = crdtSceneSystem(partialEngine, options?.onChangeFunction || null)

  async function update(dt: number) {
    await crdtSystem.receiveMessages()
    for (const system of partialEngine.getSystems()) {
      const ret: unknown | Promise<unknown> = system.fn(dt)
      checkNotThenable(
        ret,
        `A system (${
          system.name || 'anonymous'
        }) returned a thenable. Systems cannot be async functions. Documentation: https://dcl.gg/sdk/sync-systems`
      )
    }
    const dirtyEntities = crdtSystem.updateState()
    const deletedEntites = partialEngine.entityContainer.releaseRemovedEntities()
    await crdtSystem.sendMessages(dirtyEntities, deletedEntites)

    for (const definition of partialEngine.componentsIter()) {
      definition.clearDirty()
    }
  }

  return {
    addEntity: partialEngine.addEntity,
    removeEntity: partialEngine.removeEntity,
    removeEntityWithChildren: partialEngine.removeEntityWithChildren,
    addSystem: partialEngine.addSystem,
    removeSystem: partialEngine.removeSystem,
    defineComponent: partialEngine.defineComponent,
    defineComponentFromSchema: partialEngine.defineComponentFromSchema,
    registerComponentDefinition: partialEngine.registerComponentDefinition,
    getEntitiesWith: partialEngine.getEntitiesWith,
    getComponent: partialEngine.getComponent,
    getComponentOrNull: partialEngine.getComponentOrNull,
    removeComponentDefinition: partialEngine.removeComponentDefinition,
    componentsIter: partialEngine.componentsIter,
    seal: partialEngine.seal,

    update,

    RootEntity: 0 as Entity,
    PlayerEntity: 1 as Entity,
    CameraEntity: 2 as Entity,

    getEntityState: partialEngine.entityContainer.getEntityState,
    addTransport: crdtSystem.addTransport,
    getCrdtState: crdtSystem.getCrdt,

    entityContainer: partialEngine.entityContainer
  }
}
