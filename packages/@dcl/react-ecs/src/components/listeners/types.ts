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
export type MultiCallback = Partial<Record<InputAction, EventSystemCallback>>

/**
 * User key event Listeners
 * @public
 */
export type Listeners = {
  /** triggered on mouse down event */
  onMouseDown?: EventSystemCallback
  /** triggered on mouse up event */
  onMouseUp?: EventSystemCallback
  /** triggered on mouse hover event */
  onMouseEnter?: EventSystemCallback
  /** triggered on mouse leave event */
  onMouseLeave?: EventSystemCallback
  /** triggered on mouse drag event */
  onMouseDrag?: EventSystemCallback
  /** triggered on mouse drag event */
  onMouseDragLocked?: EventSystemCallback
  /** triggered on mouse drag event */
  onMouseDragEnd?: EventSystemCallback
  /** triggered on input down event */
  onInputDown?: MultiCallback,
  /** triggered on input up event */
  onInputUp?: MultiCallback,
  /** triggered on input drag event */
  onInputDrag?: MultiCallback,
  /** triggered on input drag event */
  onInputDragLocked?: MultiCallback,
  /** triggered on input drag event */
  onInputDragEnd?: MultiCallback,
}

const listeners: Listeners = {
  onMouseDown: undefined,
  onMouseUp: undefined,
  onMouseEnter: undefined,
  onMouseLeave: undefined,
  onMouseDrag: undefined,
  onMouseDragLocked: undefined,
  onMouseDragEnd: undefined,
  onInputDown: undefined,
  onInputUp: undefined,
  onInputDrag: undefined,
  onInputDragLocked: undefined,
  onInputDragEnd: undefined,
}
const listenersKey = Object.keys(listeners)

/**
 * @internal
 */
export const isListener = (key: string): key is keyof Listeners => listenersKey.includes(key)
