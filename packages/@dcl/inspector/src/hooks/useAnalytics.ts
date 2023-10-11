import { Analytics } from '@segment/analytics-node'
import { getConfig } from '../lib/logic/config'

export enum Event {
  ADD_ITEM = 'Add Item',
  REMOVE_ITEM = 'Remove Item',
  ADD_COMPONENT = 'Add Component',
  REMOVE_COMPONENT = 'Remove Component'
}

export type Events = {
  [Event.ADD_ITEM]: {
    name: string
    positionX: number
    positionY: number
    positionZ: number
  }
  [Event.REMOVE_ITEM]: {
    name: string
  }
  [Event.ADD_COMPONENT]: {
    type: string
    parentAssetPackId: number
  }
  [Event.REMOVE_COMPONENT]: {
    type: string
    parentAssetPackId: number
  }
}

export function useAnalytics() {
  const config = getConfig()
  const analytics: Analytics = new Analytics({ writeKey: config.segmentKey })
  const USER_ID = 'inspector'

  function track<T extends keyof Events>(eventName: T, eventProps: Events[T]) {
    const trackInfo = {
      event: eventName,
      userId: USER_ID,
      properties: {
        ...eventProps
      }
    }

    analytics.track(trackInfo)
  }

  return {
    get() {
      return analytics
    },
    track
  }
}
