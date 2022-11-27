import type { EventSystemCallback } from '@dcl/ecs'

export type Listeners = {
  onClick?: EventSystemCallback
}

const listeners: Listeners = {
  onClick: undefined
}
const listenersKey = Object.keys(listeners)

export const isListener = (key: string): key is keyof Listeners =>
  listenersKey.includes(key)
