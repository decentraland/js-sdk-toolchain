import { EventSystemCallback, InputAction } from '@dcl/ecs'
/**
 * legacy Callback function
 *
 * @public @deprecated
 */
export type Callback = () => void
/**
 * either a simple callback function to be triggered on a specified event,
 * or a map of `InputAction`s to functions.
 * @public
 */
export type MultiCallback = EventSystemCallback | Partial<Record<InputAction, EventSystemCallback>>

/**
 * User key event Listeners
 * @public
 */
export type Listeners = {
  /** triggered on mouse down event */
  onMouseDown?: MultiCallback
  /** triggered on mouse up event */
  onMouseUp?: MultiCallback
  /** triggered on mouse hover event */
  onMouseEnter?: EventSystemCallback
  /** triggered on mouse leave event */
  onMouseLeave?: EventSystemCallback
  /** triggered on mouse drag event */
  onMouseDrag?: MultiCallback
  /** triggered on mouse drag event */
  onMouseDragLocked?: MultiCallback
  /** triggered on mouse drag event */
  onMouseDragEnd?: MultiCallback
}

const listeners: Listeners = {
  onMouseDown: undefined,
  onMouseUp: undefined,
  onMouseEnter: undefined,
  onMouseLeave: undefined,
  onMouseDrag: undefined,
  onMouseDragLocked: undefined,
  onMouseDragEnd: undefined
}
const listenersKey = Object.keys(listeners)

/**
 * @internal
 */
export const isListener = (key: string): key is keyof Listeners => listenersKey.includes(key)
