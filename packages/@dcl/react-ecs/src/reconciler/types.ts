import type { Entity } from '@dcl/ecs'
import { Children, Key, Listeners } from '../components'
import type { EntityComponents } from '../react-ecs'

export type EngineComponents = Omit<EntityComponents, keyof Listeners>

export type OpaqueHandle = any
export type Type = 'entity'
export type Props = EntityComponents & { children?: Children; key?: Key }
export type Container = Document | Instance | any
export type Instance = {
  entity: Entity
  parent?: Entity
  rightOf?: Entity
  _child: Instance[]
}
export type TextInstance = never
export type SuspenseInstance = never
export type HydratableInstance = never
export type PublicInstance = Instance
export type HostContext = null
export type UpdatePayload = Changes[]
export type _ChildSet = never
export type TimeoutHandle = any
export type NoTimeout = number

export type Changes<K extends keyof EntityComponents = keyof EntityComponents> = {
  type: 'delete' | 'add' | 'put'
  props?: Partial<EntityComponents[K]>
  component: K
}
