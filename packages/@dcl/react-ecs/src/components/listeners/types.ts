import { PBPointerEventsResult } from '@dcl/ecs'

/**
 * Callback function to be triggered on a specified event. Receives the pointer event that
 * fired it (button, hit, and for drags the pointer delta), which handlers may ignore.
 * @public
 */
export type Callback = (event: PBPointerEventsResult) => void

/**
 * User key event Listeners
 * @public
 */
export type Listeners = {
  /** triggered on mouse down event */
  onMouseDown?: Callback
  /** triggered on mouse up event */
  onMouseUp?: Callback
  /** triggered on mouse hover event */
  onMouseEnter?: Callback
  /** triggered on mouse leave event */
  onMouseLeave?: Callback
  /** triggered while the pointer is dragged after pressing on the element */
  onMouseDrag?: Callback
  /** triggered while the pointer is dragged with the cursor locked in place */
  onMouseDragLocked?: Callback
  /** triggered when a drag that started on the element ends */
  onMouseDragEnd?: Callback
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
