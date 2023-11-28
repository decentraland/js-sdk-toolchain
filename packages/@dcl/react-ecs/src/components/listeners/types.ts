/**
 * Callback function to be triggered on a specified event
 * @public
 */
export type Callback = () => void

/**
 * User key event Listeners
 * @public
 */
export type Listeners = {
  /** triggered on mouse down event */
  onMouseDown?: Callback
  /** triggered on mouse up event */
  onMouseUp?: Callback
  /** triggered on mouse hover enter event */
  onHoverEnter?: Callback
  /** triggered on mouse hover leave event */
  onHoverLeave?: Callback
}

const listeners: Listeners = {
  onMouseDown: undefined,
  onMouseUp: undefined,
  onHoverEnter: undefined,
  onHoverLeave: undefined
}
const listenersKey = Object.keys(listeners)

/**
 * @internal
 */
export const isListener = (key: string): key is keyof Listeners => listenersKey.includes(key)
