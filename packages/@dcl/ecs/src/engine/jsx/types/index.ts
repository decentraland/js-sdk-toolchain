import {
  YGDisplay,
  YGJustify,
  YGPositionType,
  YGAlign,
  YGFlexDirection,
  YGDirection,
  YGWrap,
  YGOverflow
} from '../../../components/generated/pb/UiTransform.gen'

import { Entity } from '../../entity'

/**
 * @public
 */
export type Position = {
  top: number | string
  right: number | string
  bottom: number | string
  left: number | string
}

/**
 * @public
 */
export interface TextProps {
  value: string
  textColor: { r: number; g: number; b: number }
}

/**
 * @public
 */
export interface DivProps {
  display: YGDisplay
  flex: number
  justifyContent: YGJustify
  positionType: YGPositionType
  alignItems: YGAlign
  alignSelf: YGAlign
  alignContent: YGAlign
  flexDirection: YGFlexDirection
  position: Position
  padding: Position
  margin: Position
  border: Position
  direction: YGDirection
  width: number
  height: number
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
  flexWrap: YGWrap
  flexBasis: number
  flexGrow: number
  flexShrink: number
  overflow: YGOverflow
  children: any //TODO :Remove
  // aspectRatio: number | undefined
}

// React-Reconciler Types
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
