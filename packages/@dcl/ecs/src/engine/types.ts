import type { ISchema } from '../schemas/ISchema'
import { Result, Spec } from '../schemas/Map'
import { Transport } from '../systems/crdt/types'
import { ComponentDefinition } from './component'
import { Entity } from './entity'
import { SystemFn } from './systems'
import { ReadonlyComponentSchema } from './readonly'
import { State } from '@dcl/crdt'

export { ISchema } from '../schemas/ISchema'

/**
 * @public
 */
export type Unpacked<T> = T extends (infer U)[] ? U : T

/**
 * @public
 */
export type ComponentSchema<
  T extends [ComponentDefinition<any>, ...ComponentDefinition<any>[]]
> = {
  [K in keyof T]: T[K] extends ComponentDefinition<any>
    ? ReturnType<T[K]['getMutable']>
    : never
}

/**
 * @public
 */
export type IEngine = {
  /**
   * Increment the used entity counter and return the next one.
   * @param dynamic - whether or no the entity should be considered as Dynamic (vs Static)
   * @returns the next entity unused
   */
  addEntity(dynamic?: boolean): Entity

  /**
   * Remove all components of an entity
   * @param entity - entity
   */
  removeEntity(entity: Entity): void

  /**
   * Remove all components of each entity in the tree made with Transform parenting
   * @param firstEntity - the root entity of the tree
   */
  removeEntityWithChildren(firstEntity: Entity): void

  /**
   * Check if an entity exists in the engine
   * @param entity - the entity to validate
   * @returns true if the entity exists in the engine
   */
  entityExists(entity: Entity): boolean

  /**
   * Add the system to the engine. It will be called every tick updated.
   * @param system - function that receives the delta time between last tick and current one.
   * @param priority - a number with the priority, big number are called before smaller ones
   * @param name - optional: a unique name to identify it
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
   * @param selector - the function or the unique name to identify
   * @returns if it was found and removed
   */
  removeSystem(selector: string | SystemFn): boolean
  /**
   * Registers a custom component definition.
   * @param component - The component definition
   * @param componentId - unique id to identify the component, if the component id already exist, it will fail.
   */
  registerCustomComponent<T extends ISchema, V>(
    component: ComponentDefinition<T, V>,
    componentId: number
  ): ComponentDefinition<T, V>
  /**
   * Define a component and add it to the engine.
   * @param spec - An object with schema fields
   * @param componentId - unique id to identify the component, if the component id already exist, it will fail.
   * @param constructorDefault - the initial value prefilled when a component is created without a value
   * @returns The component definition
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
  ): ComponentDefinition<ISchema<Result<T>>, Partial<Result<T>>>
  /**
   * Define a component and add it to the engine.
   * @param spec - An object with schema fields
   * @param componentId - unique id to identify the component, if the component id already exist, it will fail.
   * @returns The component definition
   *
   * ```ts
   * const StateComponentId = 10023
   * const StateComponent = engine.defineComponent(Schemas.Bool, VisibleComponentId)
   * ```
   */
  defineComponentFromSchema<
    T extends ISchema<ConstructorType>,
    ConstructorType
  >(
    spec: T,
    componentId: number,
    constructorDefault?: ConstructorType
  ): ComponentDefinition<T, ConstructorType>

  /**
   * Get the component definition from the component id.
   * @param componentId - component number used to identify the component descriptor
   * @returns the component definition, throw an error if it doesn't exist
   * ```ts
   * const StateComponentId = 10023
   * const StateComponent = engine.getComponent(StateComponentId)
   * ```
   */
  getComponent<T extends ISchema>(componentId: number): ComponentDefinition<T>

  /**
   * Get the component definition from the component id.
   * @param componentId - component number used to identify the component descriptor
   * @returns the component definition or null if its not founded
   * ```ts
   * const StateComponentId = 10023
   * const StateComponent = engine.getComponent(StateComponentId)
   * ```
   */
  getComponentOrNull<T extends ISchema>(
    componentId: number
  ): ComponentDefinition<T> | null

  /**
   * Get a iterator of entities that has all the component requested.
   * @param components - a list of component definitions
   * @returns An iterator of an array with the [entity, component1, component2, ...]
   *
   * Example:
   * ```ts
   * for (const [entity, meshRenderer, transform] of engine.getEntitiesWith(MeshRenderer, Transform)) {
   *   // the properties of meshRenderer and transform are read only
   * }
   * ```
   */
  getEntitiesWith<
    T extends [ComponentDefinition<any>, ...ComponentDefinition<any>[]]
  >(
    ...components: T
  ): Iterable<[Entity, ...ReadonlyComponentSchema<T>]>

  /**
   * @param deltaTime - deltaTime in seconds
   */
  update(deltaTime: number): Promise<void>

  /**
   * @internal
   * @param componentId - componentId
   */
  removeComponentDefinition(componentId: number): void

  /**
   * @public
   * Refer to the root of the scene, all Transforms without a parent are parenting with RootEntity.
   */
  readonly RootEntity: Entity

  /**
   * @public
   * The current player entity
   */
  readonly PlayerEntity: Entity

  /**
   * @public
   * Camera entity of current player.
   */
  readonly CameraEntity: Entity

  /**
   * @param transport - transport which changes its onmessage to process CRDT messages
   */
  addTransport(transport: Transport): void

  /**
   * @internal
   * Returns the crdt state. For now only for testing purpose
   */
  getCrdtState(): State<Uint8Array>

  /**
   * @internal
   */
  componentsDefinition: Map<
    number,
    ComponentDefinition<ISchema<unknown>, unknown>
  >
}
