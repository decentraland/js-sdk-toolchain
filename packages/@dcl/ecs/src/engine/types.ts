import type { EcsType } from '../built-in-types/EcsType'
import { SdkComponents } from '../components'
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
export type ComponentEcsType<T extends [CompDef, ...CompDef[]]> = {
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
  defineComponent<T extends EcsType>(componentId: number, spec: T): CompDef<T>
  mutableGroupOf<T extends [CompDef, ...CompDef[]]>(
    ...components: T
  ): Iterable<[Entity, ...ComponentEcsType<T>]>
  groupOf<T extends [CompDef, ...CompDef[]]>(
    ...components: T
  ): Iterable<[Entity, ...DeepReadonly<ComponentEcsType<T>>]>
  getComponent<T extends EcsType>(componentId: number): CompDef<T>
  update(dt: number): void
  baseComponents: SdkComponents
}

/**
 * @public
 */
export type IEngineParams = {
  transports?: Transport[]
}
