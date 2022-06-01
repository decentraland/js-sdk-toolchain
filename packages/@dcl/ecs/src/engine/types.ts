import type { EcsType } from '../built-in-types/EcsType'
import { SdkComponetns } from '../components'
import { ComponentDefinition as CompDef } from './component'
import { Entity } from './entity'
import type { DeepReadonly } from './utils'

/**
 * @public
 */
export type Unpacked<T> = T extends (infer U)[] ? U : T
/**
 * @public
 */
export type Update = (dt: number) => void

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
  addSystem(system: Update): void
  defineComponent<T extends EcsType>(componentId: number, spec: T): CompDef<T>
  mutableGroupOf<T extends [CompDef, ...CompDef[]]>(
    ...components: T
  ): Iterable<[Entity, ...ComponentEcsType<T>]>
  groupOf<T extends [CompDef, ...CompDef[]]>(
    ...components: T
  ): Iterable<[Entity, ...DeepReadonly<ComponentEcsType<T>>]>
  getComponent<T extends EcsType>(componentId: number): CompDef<T>
  update(dt: number): void
  baseComponents: SdkComponetns
}
