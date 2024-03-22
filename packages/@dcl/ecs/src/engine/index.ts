import * as components from '../components'
import { componentNumberFromName } from '../components/component-number'
import { checkNotThenable } from '../runtime/invariant'
import { Schemas } from '../schemas'
import { ISchema } from '../schemas/ISchema'
import { MapResult, Spec } from '../schemas/Map'
import { ByteBuffer } from '../serialization/ByteBuffer'
import { crdtSceneSystem, OnChangeFunction } from '../systems/crdt'
import { ComponentDefinition } from './component'
import { createComponentDefinitionFromSchema } from './lww-element-set-component-definition'
import { Entity, createEntityContainer } from './entity'
import { ReadonlyComponentSchema } from './readonly'
import { SystemItem, SystemContainer, SystemFn, SYSTEMS_REGULAR_PRIORITY } from './systems'
import type {
  IEngine,
  IEngineOptions,
  LastWriteWinElementSetComponentDefinition,
  MapComponentDefinition,
  PreEngine
} from './types'
import {
  createValueSetComponentDefinitionFromSchema,
  ValueSetOptions
} from './grow-only-value-set-component-definition'
import { removeEntityWithChildren as removeEntityWithChildrenEngine } from '../runtime/helpers/tree'
import { CrdtMessageType } from '../serialization/crdt'
export * from './input'
export * from './readonly'
export * from './types'
export { Entity, ByteBuffer, SystemItem, OnChangeFunction }

function preEngine(options?: IEngineOptions): PreEngine {
  const entityContainer = options?.entityContainer ?? createEntityContainer()
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
      // TODO: hack for the moment.
      // We still need the NetworkEntity to forward this message to the SyncTransport.
      // If we remove it then we can't notify the other users which entity was deleted.
      if (component.componentName === 'core-schema::Network-Entity') continue
      component.entityDeleted(entity, true)
    }

    return entityContainer.removeEntity(entity)
  }

  function removeEntityWithChildren(entity: Entity) {
    return removeEntityWithChildrenEngine(
      { removeEntity, defineComponentFromSchema, getEntitiesWith, defineComponent },
      entity
    )
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
    const componentId = componentNumberFromName(componentName)
    const prev = componentsDefinition.get(componentId)
    if (prev) {
      // TODO: assert spec === prev.spec
      return prev as components.LastWriteWinElementSetComponentDefinition<T>
    }
    /* istanbul ignore next */
    if (sealed) throw new Error('Engine is already sealed. No components can be added at this stage')
    const newComponent: LastWriteWinElementSetComponentDefinition<T> = createComponentDefinitionFromSchema<T>(
      componentName,
      componentId,
      schema
    )
    componentsDefinition.set(componentId, newComponent)
    return newComponent as components.LastWriteWinElementSetComponentDefinition<T>
  }

  function defineValueSetComponentFromSchema<T>(
    componentName: string,
    schema: ISchema<T>,
    options: ValueSetOptions<T>
  ): components.GrowOnlyValueSetComponentDefinition<T> {
    const componentId = componentNumberFromName(componentName)
    const prev = componentsDefinition.get(componentId)
    if (prev) {
      // TODO: assert spec === prev.spec
      return prev as components.GrowOnlyValueSetComponentDefinition<T>
    }
    /* istanbul ignore next */
    if (sealed) throw new Error('Engine is already sealed. No components can be added at this stage')
    const newComponent = createValueSetComponentDefinitionFromSchema<T>(componentName, componentId, schema, options)
    componentsDefinition.set(componentId, newComponent)
    return newComponent as components.GrowOnlyValueSetComponentDefinition<T>
  }

  function defineComponent<T extends Spec>(
    componentName: string,
    mapSpec: T,
    constructorDefault?: Partial<MapResult<T>>
  ) {
    const componentId = componentNumberFromName(componentName)
    const prev = componentsDefinition.get(componentId)
    if (prev) {
      // TODO: assert spec === prev.spec
      return prev as MapComponentDefinition<MapResult<T>>
    }
    if (sealed) throw new Error('Engine is already sealed. No components can be added at this stage')

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

  function getComponent<T>(componentIdOrName: number | string): ComponentDefinition<T> {
    const componentId =
      typeof componentIdOrName === 'number' ? componentIdOrName : componentNumberFromName(componentIdOrName)
    const component = componentsDefinition.get(componentId)
    if (!component) {
      throw new Error(
        `Component ${componentIdOrName} not found. You need to declare the components at the beginnig of the engine declaration`
      )
    }
    return component as ComponentDefinition<T>
  }

  function getComponentOrNull<T>(componentIdOrName: number | string): ComponentDefinition<T> | null {
    const componentId =
      typeof componentIdOrName === 'number' ? componentIdOrName : componentNumberFromName(componentIdOrName)
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

  function getEntityOrNullByName(value: string) {
    const NameComponent = components.Name({ defineComponent })
    for (const [entity, name] of getEntitiesWith(NameComponent)) {
      if (name.value === value) return entity
    }
    return null
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

  function removeComponentDefinition(componentIdOrName: number | string) {
    if (sealed) throw new Error('Engine is already sealed. No components can be removed at this stage')

    const componentId =
      typeof componentIdOrName === 'number' ? componentIdOrName : componentNumberFromName(componentIdOrName)
    componentsDefinition.delete(componentId)
  }

  components.Transform({ defineComponentFromSchema })

  function seal() {
    if (!sealed) {
      sealed = true
    }
  }

  return {
    addEntity,
    removeEntity,
    removeEntityWithChildren,
    addSystem,
    getSystems,
    removeSystem,
    defineComponent,
    defineComponentFromSchema,
    defineValueSetComponentFromSchema,
    getEntitiesWith,
    getComponent,
    getComponentOrNull: getComponentOrNull as IEngine['getComponentOrNull'],
    getEntityOrNullByName,
    removeComponentDefinition,
    registerComponentDefinition,
    entityContainer,
    componentsIter,
    seal
  }
}
/**
 * Internal constructor of new engines, this is an internal API
 * @public
 * @deprecated Prevent manual usage prefer "engine" for scene development
 */
export function Engine(options?: IEngineOptions): IEngine {
  const partialEngine = preEngine(options)
  const onChangeFunction: OnChangeFunction = (entity, operation, component, componentValue) => {
    if (operation === CrdtMessageType.DELETE_ENTITY) {
      for (const component of partialEngine.componentsIter()) {
        const onChange = component?.__onChangeCallbacks(entity)
        if (onChange) {
          onChange(undefined)
        }
      }
    } else {
      const onChange = component?.__onChangeCallbacks(entity)
      if (onChange) {
        onChange(componentValue)
      }
    }
    return options?.onChangeFunction(entity, operation, component, componentValue)
  }
  const crdtSystem = crdtSceneSystem(partialEngine, onChangeFunction)

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
    // get the deleted entities to send the DeleteEntity CRDT commands
    const deletedEntites = partialEngine.entityContainer.releaseRemovedEntities()

    await crdtSystem.sendMessages(deletedEntites)
  }

  return {
    _id: Date.now(),
    addEntity: partialEngine.addEntity,
    removeEntity: partialEngine.removeEntity,
    removeEntityWithChildren: partialEngine.removeEntityWithChildren,
    addSystem: partialEngine.addSystem,
    removeSystem: partialEngine.removeSystem,
    defineComponent: partialEngine.defineComponent,
    defineComponentFromSchema: partialEngine.defineComponentFromSchema,
    defineValueSetComponentFromSchema: partialEngine.defineValueSetComponentFromSchema,
    registerComponentDefinition: partialEngine.registerComponentDefinition,
    getEntitiesWith: partialEngine.getEntitiesWith,
    getComponent: partialEngine.getComponent,
    getComponentOrNull: partialEngine.getComponentOrNull,
    removeComponentDefinition: partialEngine.removeComponentDefinition,
    componentsIter: partialEngine.componentsIter,
    seal: partialEngine.seal,
    getEntityOrNullByName: partialEngine.getEntityOrNullByName,

    update,

    RootEntity: 0 as Entity,
    PlayerEntity: 1 as Entity,
    CameraEntity: 2 as Entity,

    getEntityState: partialEngine.entityContainer.getEntityState,
    addTransport: crdtSystem.addTransport,

    entityContainer: partialEngine.entityContainer
  }
}
