import { SdkComponents } from '../components/types'
import type { ISchema } from '../schemas/ISchema'
import { Result, Spec } from '../schemas/Map'
import { Transport } from '../systems/crdt/transports/types'
import { ComponentDefinition as CompDef } from './component'
import { Entity } from './entity'
import { Update } from './systems'
import type { DeepReadonly } from './utils'

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
   * Add the system to the engine. It will be called every tick updated.
   * @param system function that receives the delta time between last tick and current one.
   * @param priority a number with the priority, big number are called before smaller ones
   * @param name optional: a unique name to identify it
   *
   * Example:
   * ```ts
   * function mySystem(dt: number) {
   *   const entitiesWithBoxShapes = engine.getEntitiesWith(BoxShape, Transform)
   *   for (const [entity, _boxShape, _transform] of engine.getEntitiesWith(BoxShape, Transform)) {
   *     // do stuffs
   *   }
   * }
   * engine.addSystem(mySystem, 10)
   * ```
   */
  addSystem(system: Update, priority?: number, name?: string): void

  /**
   * Remove a system from the engine.
   * @param selector the function or the unique name to identify
   * @returns if it was found and removed
   */
  removeSystem(selector: string | Update): boolean

  /**
   * Define a component and add it to the engine.
   * @param spec An object with schema fields
   * @param componentId unique id to identify the component, if the component id already exist, it will fail.
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
  defineComponent<T extends Spec>(
    spec: Spec,
    componentId: number
  ): CompDef<ISchema<Result<T>>>

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
  defineComponentFromSchema<T extends ISchema>(
    spec: T,
    componentId: number
  ): CompDef<T>

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
   * for (const [entity, boxShape, transform] of engine.getEntitiesWith(BoxShape, Transform)) {
   *   // the properties of boxShape and transform are read only
   * }
   * ```
   */
  getEntitiesWith<T extends [CompDef, ...CompDef[]]>(
    ...components: T
  ): Iterable<[Entity, ...DeepReadonly<ComponentSchema<T>>]>

  /**
   * @internal
   *
   * @param dt
   */
  update(dt: number): void

  baseComponents: SdkComponents
}

/**
 * @public
 */
export type IEngineParams = {
  transports?: Transport[]
}
