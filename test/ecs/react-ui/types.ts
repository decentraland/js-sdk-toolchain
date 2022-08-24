import { Entity } from '../../src/engine'
import { DivProps } from '../../src/engine/jsx'

export type OpaqueHandle = any
export type Type = string
export type Props = Partial<DivProps>
export type Container = Document | Instance | any
export type Instance = {
  entity: Entity
  componentId: number
  parent?: Entity
  rightOf?: Entity
  _child: Instance[]
}
export type TextInstance = unknown
export type SuspenseInstance = any
export type HydratableInstance = any
export type PublicInstance = any
export type HostContext = any
export type UpdatePayload = any
export type _ChildSet = any
export type TimeoutHandle = any
export type NoTimeout = number
