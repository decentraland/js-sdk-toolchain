import { v4 as uuidv4 } from 'uuid'
import { Analytics as SegmentAnalytics } from '@segment/analytics-node'
import { getConfig } from './config'

export enum Event {
  ADD_ITEM = 'Add Item',
  REMOVE_ITEM = 'Remove Item',
  ADD_COMPONENT = 'Add Component',
  REMOVE_COMPONENT = 'Remove Component'
}

export type Events = {
  [Event.ADD_ITEM]: {
    itemId: string
    itemName: string
  }
  [Event.REMOVE_ITEM]: {
    itemId: string
    itemName: string
  }
  [Event.ADD_COMPONENT]: {
    componentName: string
    parentItemId: string
  }
  [Event.REMOVE_COMPONENT]: {
    componentName: string
    parentItemId: string
  }
}

const noopAnalytics = {
  track() {}
}

class Analytics {
  private static instance: Analytics | null = null
  private analytics: SegmentAnalytics | { track(): void } = noopAnalytics
  private userId: string = uuidv4()

  constructor() {
    if (Analytics.instance) {
      return Analytics.instance
    }

    const config = getConfig()

    if (config.segmentKey) {
      this.analytics = new SegmentAnalytics({ writeKey: config.segmentKey })

      if (config.segmentUserId) {
        this.userId = config.segmentUserId
      }

      let traits: Record<string, unknown> = {
        createdAt: new Date()
      }

      if (config.segmentAppId) {
        traits = {
          ...traits,
          appId: config.segmentAppId
        }
      }

      this.analytics.identify({
        userId: this.userId,
        traits
      })
    }

    Analytics.instance = this
  }

  getAnalytics() {
    return this.analytics
  }

  track<T extends keyof Events>(eventName: T, eventProps: Events[T]) {
    const trackInfo = {
      event: eventName,
      userId: this.userId,
      properties: {
        ...eventProps
      }
    }

    this.analytics.track(trackInfo)
  }
}

export const analytics = new Analytics()
