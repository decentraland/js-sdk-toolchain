import type { ISchema } from '../schemas/ISchema'
import { Transport } from '../systems/crdt/transports/types'
import { ComponentDefinition as CompDef } from './component'
import { Entity } from './entity'
import { Update } from './systems'
import type { DeepReadonly } from './utils'

/**
 * @public
 */
export type Unpacked<T> = T extends (infer U)[] ? U : T

/**
 * @public
 */
export type ComponentSchema<T extends [CompDef, ...CompDef[]]> = {
  [K in keyof T]: T[K] extends CompDef ? ReturnType<T[K]['mutable']> : never
}

/**
 * @public
 */
export type IEngine = {
  addEntity(dynamic?: boolean): Entity
  addDynamicEntity(): Entity
  removeEntity(entity: Entity): void
  addSystem(system: Update, priority?: number, name?: string): void
  removeSystem(selector: string | Update): boolean
  defineComponent<T extends ISchema>(componentId: number, spec: T): CompDef<T>
  mutableGroupOf<T extends [CompDef, ...CompDef[]]>(
    ...components: T
  ): Iterable<[Entity, ...ComponentSchema<T>]>
  groupOf<T extends [CompDef, ...CompDef[]]>(
    ...components: T
  ): Iterable<[Entity, ...DeepReadonly<ComponentSchema<T>>]>
  getComponent<T extends ISchema>(componentId: number): CompDef<T>
  update(dt: number): void
}

/**
 * @public
 */
export type IEngineParams = {
  transports?: Transport[]
}
