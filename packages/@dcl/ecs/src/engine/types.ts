import { SdkComponents } from '../components/types'
import type { ISchema } from '../schemas/ISchema'
import { Result, Spec } from '../schemas/Map'
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
  [K in keyof T]: T[K] extends CompDef
    ? ReturnType<T[K]['getModifiable']>
    : never
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

  defineComponent<T extends Spec>(
    spec: Spec,
    componentId?: number
  ): CompDef<ISchema<Result<T>>>
  defineComponentFromSchema<T extends ISchema>(
    spec: T,
    componentId?: number
  ): CompDef<T>

  getComponent<T extends ISchema>(componentId: number): CompDef<T>

  getEntitiesWith<T extends [CompDef, ...CompDef[]]>(
    ...components: T
  ): Iterable<[Entity, ...DeepReadonly<ComponentSchema<T>>]>

  update(dt: number): void

  baseComponents: SdkComponents
}

/**
 * @public
 */
export type IEngineParams = {
  transports?: Transport[]
}
