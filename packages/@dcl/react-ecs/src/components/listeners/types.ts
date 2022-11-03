import type { EventsSystem } from '@dcl/ecs'

export type OnClick = EventsSystem.Callback

export type Listeners = {
  onClick?: OnClick
}

const listeners: Listeners = {
  onClick: undefined
}
const listenersKey = Object.keys(listeners)

export const isListener = (key: string): key is keyof Listeners =>
  listenersKey.includes(key)
