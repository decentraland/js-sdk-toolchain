import { EventSystemCallback, InputAction } from '@dcl/ecs'
/**
 * Callback function to be triggered on a specified event
 * @public
 */
export type Callback = () => void
export type MultiCallback = Callback | Partial<Record<InputAction, EventSystemCallback>> 

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
  onMouseEnter?: Callback
  /** triggered on mouse leave event */
  onMouseLeave?: Callback
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
