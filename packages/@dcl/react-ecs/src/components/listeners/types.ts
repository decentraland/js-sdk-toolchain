export type Callback = () => void

export type Listeners = {
  onMouseDown?: Callback
  onMouseUp?: Callback
}

const listeners: Listeners = {
  onMouseDown: undefined,
  onMouseUp: undefined
}
const listenersKey = Object.keys(listeners)

export const isListener = (key: string): key is keyof Listeners => listenersKey.includes(key)
