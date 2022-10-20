import { SdkComponents } from '../components'
import type { ISchema } from '../schemas/ISchema'
import { Result, Spec } from '../schemas/Map'
import { Transport } from '../systems/crdt/transports/types'
import { ComponentDefinition as CompDef, ComponentType } from './component'
import { Entity } from './entity'
import { SystemFn } from './systems'
import { ReadonlyComponentSchema } from './readonly'

export { ISchema } from '../schemas/ISchema'

/**
 * @public
 */
export type Unpacked<T> = T extends (infer U)[] ? U : T

/**
 * @public
 */
export type ComponentSchema<T extends [CompDef, ...CompDef[]]> = {
  [K in keyof T]: T[K] extends CompDef ? ReturnType<T[K]['getMutable']> : never
}

/**
 * @public
 */
export type IEngine = {
  /**
   * Increment the used entity counter and return the next one.
   * @param dynamic
   * @return the next entity unused
   */
  addEntity(dynamic?: boolean): Entity

  /**
   * An alias of engine.addEntity(true)
   */
  addDynamicEntity(): Entity

  /**
   * Remove all components of an entity
   * @param entity
   */
  removeEntity(entity: Entity): void

  /**
   * Remove all components of each entity in the tree made with Transform parenting
   * @param firstEntity - the root entity of the tree
   */
  removeEntityWithChildren(firstEntity: Entity): void

  /**
   * Add the system to the engine. It will be called every tick updated.
   * @param system function that receives the delta time between last tick and current one.
   * @param priority a number with the priority, big number are called before smaller ones
   * @param name optional: a unique name to identify it
   *
   * Example:
   * ```ts
   * function mySystem(dt: number) {
   *   const entitiesWithMeshRenderer = engine.getEntitiesWith(MeshRenderer, Transform)
   *   for (const [entity, _meshRenderer, _transform] of engine.getEntitiesWith(MeshRenderer, Transform)) {
   *     // do stuffs
   *   }
   * }
   * engine.addSystem(mySystem, 10)
   * ```
   */
  addSystem(system: SystemFn, priority?: number, name?: string): void

  /**
   * Remove a system from the engine.
   * @param selector the function or the unique name to identify
   * @returns if it was found and removed
   */
  removeSystem(selector: string | SystemFn): boolean

  /**
   * Define a component and add it to the engine.
   * @param spec An object with schema fields
   * @param componentId unique id to identify the component, if the component id already exist, it will fail.
   * @param constructorDefault the initial value prefilled when a component is created without a value
   * @return The component definition
   *
   * ```ts
   * const DoorComponentId = 10017
   * const Door = engine.defineComponent({
   *   id: Schemas.Int,
   *   name: Schemas.String
   * }, DoorComponentId)
   *
   * ```
   */
  defineComponent<T extends Spec, ConstructorType = Partial<Result<T>>>(
    spec: T,
    componentId: number,
    constructorDefault?: ConstructorType
  ): CompDef<ISchema<Result<T>>, Partial<Result<T>>>

  /**
   * Define a component and add it to the engine.
   * @param spec An object with schema fields
   * @param componentId unique id to identify the component, if the component id already exist, it will fail.
   * @return The component definition
   *
   * ```ts
   * const StateComponentId = 10023
   * const StateComponent = engine.defineComponent(Schemas.Bool, VisibleComponentId)
   * ```
   */
  defineComponentFromSchema<
    T extends ISchema<Record<string, any>>,
    ConstructorType = ComponentType<T>
  >(
    spec: T,
    componentId: number,
    constructorDefault?: ConstructorType
  ): CompDef<T, ConstructorType>

  /**
   * Get the component definition from the component id.
   * @param componentId
   * @return the component definition, throw an error if it doesn't exist
   * ```ts
   * const StateComponentId = 10023
   * const StateComponent = engine.getComponent(StateComponentId)
   * ```
   */
  getComponent<T extends ISchema>(componentId: number): CompDef<T>

  /**
   * Get a iterator of entities that has all the component requested.
   * @param components a list of component definitions
   * @return An iterator of an array with the [entity, component1, component2, ...]
   *
   * Example:
   * ```ts
   * for (const [entity, meshRenderer, transform] of engine.getEntitiesWith(MeshRenderer, Transform)) {
   *   // the properties of meshRenderer and transform are read only
   * }
   * ```
   */
  getEntitiesWith<T extends [CompDef, ...CompDef[]]>(
    ...components: T
  ): Iterable<[Entity, ...ReadonlyComponentSchema<T>]>

  /**
   * @internal
   *
   * @param dt
   */
  update(dt: number): void

  /**
   * @internal
   * @param componentId
   */
  removeComponentDefinition(componentId: number): void

  /**
   * @public
   * Refer to the root of the scene, all Transforms without a parent are parenting with RootEntity.
   */
  RootEntity: Entity

  /**
   * @public
   * The current player entity
   */
  PlayerEntity: Entity

  /**
   * @public
   * Camera entity of current player.
   */
  CameraEntity: Entity

  baseComponents: SdkComponents
}

/**
 * @public
 */
export type IEngineParams = {
  transports?: Transport[]
}
