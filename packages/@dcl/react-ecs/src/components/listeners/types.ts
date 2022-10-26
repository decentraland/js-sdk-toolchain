export type OnClick = () => Promise<void> | void

export type Listeners = {
  onClick?: OnClick
}

const listeners: Listeners = {
  onClick: undefined
}
const listenersKey = Object.keys(listeners)

export const isListener = (key: string): key is keyof Listeners => listenersKey.includes(key)
