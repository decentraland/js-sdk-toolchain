import type { IEntity } from '@dcl/ecs'
import type { EntityComponents } from '../react-ecs'

export type OpaqueHandle = any
export type Type = 'entity'
export type Props = EntityComponents
export type Container = Document | Instance | any
export type Instance = {
  entity: IEntity
  parent?: IEntity
  rightOf?: IEntity
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

export type Changes<K extends keyof EntityComponents = keyof EntityComponents> =
  {
    type: 'delete' | 'add' | 'put'
    props?: Partial<EntityComponents[K]>
    component: K
  }
