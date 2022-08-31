import { crdtSceneSystem } from '../systems/crdt'
import { Entity, EntityContainer } from './entity'
import {
  ComponentType,
  ComponentDefinition,
  defineComponent as defComponent
} from './component'
import type { ComponentSchema, IEngineParams } from './types'
import type { DeepReadonly } from '../Math'
import { IEngine } from './types'
import { ByteBuffer } from '../serialization/ByteBuffer'
import { SystemContainer, SYSTEMS_REGULAR_PRIORITY, Update } from './systems'
import { ISchema } from '../schemas/ISchema'
import { Result, Spec } from '../schemas/Map'
import { Schemas } from '../schemas'
import { defineSdkComponents } from '../components'

export { ComponentType, Entity, ByteBuffer, ComponentDefinition }
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
  const systems = SystemContainer()

  function addSystem(
    fn: Update,
    priority: number = SYSTEMS_REGULAR_PRIORITY,
    name?: string
  ) {
    systems.add(fn, priority, name)
  }

  function removeSystem(selector: string | Update) {
    return systems.remove(selector)
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
    for (const [, component] of componentsDefinition) {
      if (component.has(entity)) {
        component.deleteFrom(entity)
      }
    }

    return entityContainer.removeEntity(entity)
  }

  function defineComponentFromSchema<
    T extends ISchema,
    ConstructorType = ComponentType<T>
  >(
    spec: T,
    componentId: number,
    constructorDefault?: ConstructorType
  ): ComponentDefinition<T, ConstructorType> {
    if (componentsDefinition.get(componentId)) {
      throw new Error(`Component ${componentId} already declared`)
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
  ): ComponentDefinition<ISchema<Result<T>>, ConstructorType> {
    return defineComponentFromSchema(
      Schemas.Map(spec),
      componentId,
      constructorDefault
    )
  }

  function getComponent<T extends ISchema>(
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

  function* getEntitiesWith<
    T extends [ComponentDefinition, ...ComponentDefinition[]]
  >(...components: T): Iterable<[Entity, ...DeepReadonly<ComponentSchema<T>>]> {
    for (const [entity, ...groupComp] of getComponentDefGroup(...components)) {
      yield [entity, ...groupComp.map((c) => c.get(entity))] as [
        Entity,
        ...DeepReadonly<ComponentSchema<T>>
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

  function getSystems() {
    return systems.getSystems()
  }

  function removeComponentDefinition(componentId: number) {
    componentsDefinition.delete(componentId)
  }

  return {
    entitiesComponent,
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
    removeComponentDefinition
  }
}

/**
 * @public
 */
export type PreEngine = ReturnType<typeof preEngine>

/**
 * @public
 */
export function Engine({ transports }: IEngineParams = {}): IEngine {
  const engine = preEngine()
  const crdtSystem = crdtSceneSystem({ engine, transports: transports || [] })
  const baseComponents = defineSdkComponents(engine)

  function update(dt: number) {
    crdtSystem.receiveMessages()

    for (const system of engine.getSystems()) {
      system.fn(dt)
    }

    // Selected components that only exist one frame
    //  then, they are deleted but their crdt state keeps
    const removeSelectedComponents = [
      baseComponents.PointerEventsResult,
    ]
    const excludeComponentIds = removeSelectedComponents.map((item) => item._id)
    for (const componentDef of removeSelectedComponents) {
      for (const [entity] of engine.getEntitiesWith(componentDef)) {
        componentDef.deleteFrom(entity)
      }
    }

    // TODO: Perf tip
    // Should we add some dirtyIteratorSet at engine level so we dont have
    // to iterate all the component definitions to get the dirty ones ?
    const dirtySet = new Map<Entity, Set<number>>()
    for (const [componentId, definition] of engine.componentsDefinition) {
      if (excludeComponentIds.includes(componentId)) continue

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
    removeSystem: engine.removeSystem,
    defineComponent: engine.defineComponent,
    defineComponentFromSchema: engine.defineComponentFromSchema,
    getEntitiesWith: engine.getEntitiesWith,
    getComponent: engine.getComponent,
    removeComponentDefinition: engine.removeComponentDefinition,
    update,
    baseComponents
  }
}
