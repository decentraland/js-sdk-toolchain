import type { ISchema } from '../schemas/ISchema'
import { MapResult, Spec } from '../schemas/Map'
import { OnChangeFunction } from '../systems/crdt'
import { Transport } from '../systems/crdt/types'
import {
  ComponentDefinition,
  GrowOnlyValueSetComponentDefinition,
  LastWriteWinElementSetComponentDefinition
} from './component'
import { Entity, IEntityContainer, EntityState } from './entity'
import { ValueSetOptions } from './grow-only-value-set-component-definition'
import { ReadonlyComponentSchema } from './readonly'
import { SystemFn, SystemItem } from './systems'
export * from './component'
export { ValueSetOptions }

/**
 * @public
 */
export type Unpacked<T> = T extends (infer U)[] ? U : T

/**
 * @public
 * Overrides component definition to support partial default values
 */
export interface MapComponentDefinition<T> extends LastWriteWinElementSetComponentDefinition<T> {
  /**
   * Add the current component to an entity, throw an error if the component already exists (use `createOrReplace` instead).
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity that will be used to create the component
   * @param val - The initial value
   */
  create(entity: Entity, val?: Partial<T>): T
  /**
   * Add the current component to an entity or replace the content if the entity already has the component
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity that will be used to create or replace the component
   * @param val - The initial or new value
   */
  createOrReplace(entity: Entity, val?: Partial<T>): T
}

/**
 * @internal
 */
export type PreEngine = Pick<
  IEngine,
  | 'addEntity'
  | 'removeEntity'
  | 'removeEntityWithChildren'
  | 'addSystem'
  | 'removeSystem'
  | 'defineComponent'
  | 'defineComponentFromSchema'
  | 'defineValueSetComponentFromSchema'
  | 'registerComponentDefinition'
  | 'getEntitiesWith'
  | 'getComponent'
  | 'getComponentOrNull'
  | 'removeComponentDefinition'
  | 'componentsIter'
  | 'seal'
  | 'entityContainer'
  | 'getEntityOrNullByName'
> & {
  getSystems: () => SystemItem[]
}

/**
 * @public
 */
export interface IEngineOptions {
  onChangeFunction: OnChangeFunction
  entityContainer?: IEntityContainer
}

/**
 * @public
 */
export interface IEngine {
  _id: number
  /**
   * @public
   * Increment the used entity counter and return the next one.
   * @returns the next entity unused
   */
  addEntity(): Entity

  /**
   * @public
   * Remove all components of an entity
   * @param entity - entity
   */
  removeEntity(entity: Entity): void

  /**
   * Remove all components of each entity in the tree made with Transform parenting
   * @param entity - the root entity of the tree
   */
  removeEntityWithChildren(entity: Entity): void

  /**
   *
   * @public
   * Check the state of an entityin  the engine
   * @param entity - the entity to validate
   * @returns EntityState enum
   */
  getEntityState(entity: Entity): EntityState

  /**
   * @public
   * Add the system to the engine. It will be called every tick updated.
   * @param system - function that receives the delta time between last tick and current one.
   * @param priority - a number with the priority, big number are called before smaller ones
   * @param name - optional: a unique name to identify it
   *
   * @example
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
   * @public
   * Remove a system from the engine.
   * @param selector - the function or the unique name to identify
   * @returns if it was found and removed
   */
  removeSystem(selector: string | SystemFn): boolean
  /**
   * @public
   * Registers a custom component definition.
   * @param componentName - unique name to identify the component, a hash is calculated for it, it will fail if the hash has collisions.
   * @param componentDefinition - The component definition
   */
  registerComponentDefinition<T>(
    componentName: string,
    componentDefinition: ComponentDefinition<T>
  ): ComponentDefinition<T>
  /**
   * @public
   * Define a component and add it to the engine.
   * @param componentName - unique name to identify the component, a hash is calculated for it, it will fail if the hash has collisions.
   * @param spec - An object with schema fields
   * @param constructorDefault - the initial value prefilled when a component is created without a value
   * @returns The component definition
   *
   * @example
   * ```ts
   * const CustomComponent = engine.defineComponent("my-scene::custom-name", {
   *   id: Schemas.Int,
   *   name: Schemas.String
   * })
   * ```
   */
  defineComponent<T extends Spec>(
    componentName: string,
    spec: T,
    constructorDefault?: Partial<MapResult<T>>
  ): MapComponentDefinition<MapResult<T>>

  /**
   * @public
   * Define a component and add it to the engine.
   * @param componentName - unique name to identify the component, a hash is calculated for it, it will fail if the hash has collisions.
   * @param spec - An object with schema fields
   * @returns The component definition
   *
   * @example
   * ```ts
   * const StateComponentId = 10023
   * const StateComponent = engine.defineComponentFromSchema("my-lib::VisibleComponent", Schemas.Bool)
   * ```
   */
  defineComponentFromSchema<T>(componentName: string, spec: ISchema<T>): LastWriteWinElementSetComponentDefinition<T>
  /**
   * @public
   * Defines a value set component.
   * @param componentName - unique name to identify the component, a hash is calculated for it, it will fail if the hash has collisions.
   * @param spec - An object with schema fields
   * @returns The component definition
   *
   * @example
   * ```ts
   * const StateComponentId = 10023
   * const StateComponent = engine.defineValueSetComponentFromSchema("my-lib::VisibleComponent", Schemas.Int)
   * ```
   */
  defineValueSetComponentFromSchema<T>(
    componentName: string,
    spec: ISchema<T>,
    options: ValueSetOptions<T>
  ): GrowOnlyValueSetComponentDefinition<T>

  /**
   * @public
   * Get the component definition from the component id.
   * @param componentId - component number or name used to identify the component descriptor
   * @returns the component definition, throw an error if it doesn't exist
   * ```ts
   * const StateComponentId = 10023
   * const StateComponent = engine.getComponent(StateComponentId)
   * ```
   */
  getComponent<T>(componentId: number | string): ComponentDefinition<T>

  /**
   * Get the component definition from the component id.
   * @param componentId - component number or name used to identify the component descriptor
   * @returns the component definition or null if its not founded
   * ```ts
   * const StateComponentId = 10023
   * const StateComponent = engine.getComponent(StateComponentId)
   * ```
   */
  getComponentOrNull<T>(componentId: number | string): ComponentDefinition<T> | null

  /**
   * @public
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
  getEntitiesWith<T extends [ComponentDefinition<any>, ...ComponentDefinition<any>[]]>(
    ...components: T
  ): Iterable<[Entity, ...ReadonlyComponentSchema<T>]>

  /**
   * @alpha
   * Search for the entity that matches de label string defined in the editor.
   * @param value - Name value string
   */
  getEntityOrNullByName(label: string): Entity | null

  /**
   * @public
   * @param deltaTime - deltaTime in seconds
   */
  update(deltaTime: number): Promise<void>

  /**
   * @public
   * @param componentId - component number or name
   */
  removeComponentDefinition(componentId: number | string): void

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
   * @alpha
   * @param transport - transport which changes its onmessage to process CRDT messages
   */
  addTransport(transport: Transport): void

  /**
   * @public
   * Iterator of registered components
   */
  componentsIter(): Iterable<ComponentDefinition<unknown>>

  /**
   * Seals the engine components. It is used to clearly define the scope of the
   * components that will be available to this engine and to run optimizations.
   */
  seal(): void

  /**
   * @internal
   * Entity container with custom methods to update their state.
   */
  entityContainer: IEntityContainer
}
