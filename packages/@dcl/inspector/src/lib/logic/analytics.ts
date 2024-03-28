import { v4 as uuidv4 } from 'uuid'
import { Analytics as SegmentAnalytics } from '@segment/analytics-node'
import { getConfig } from './config'

export enum Event {
  ADD_ITEM = 'Add Item',
  ADD_COMPONENT = 'Add Component',
  REMOVE_COMPONENT = 'Remove Component',
  SEARCH_ITEM = 'Search Item',
  SWITCH_BUILDER_MODE = 'Switch Builder Mode'
}

export type Events = {
  [Event.ADD_ITEM]: {
    itemId?: string
    itemName: string
    itemPath: string
    isSmart: boolean
  }
  [Event.ADD_COMPONENT]: {
    componentName: string
    itemId?: string
    itemPath: string
  }
  [Event.REMOVE_COMPONENT]: {
    componentName: string
    itemId?: string
    itemPath: string
  }
  [Event.SEARCH_ITEM]: {
    keyword: string
    itemsFound: number
    category?: string
  }
  [Event.SWITCH_BUILDER_MODE]: {
    itemId: string
    itemName: string
    isAdvancedView: boolean
  }
}

const noopAnalytics = {
  track() {}
}

class Analytics {
  private static instance: Analytics | null = null
  private analytics: SegmentAnalytics | { track(): void } = noopAnalytics
  private userId: string = uuidv4()
  private appId: string | undefined = undefined

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

      if (config.segmentAppId) {
        this.appId = config.segmentAppId
      }

      this.analytics.identify({
        userId: this.userId,
        traits: this.getTraits()
      })
    }

    Analytics.instance = this
  }

  getAnalytics() {
    return this.analytics
  }

  getTraits() {
    let traits: Record<string, unknown> = {}

    if (this.appId) {
      traits = {
        ...traits,
        appId: this.appId
      }
    }

    return traits
  }

  getBaseProperties() {
    const config = getConfig()

    let baseProperties = {}

    if (config.projectId) {
      baseProperties = {
        ...baseProperties,
        projectId: config.projectId
      }
    }

    return baseProperties
  }

  track<T extends keyof Events>(eventName: T, eventProps: Events[T]) {
    const trackInfo = {
      event: eventName,
      userId: this.userId,
      properties: {
        ...this.getTraits(),
        ...this.getBaseProperties(),
        ...eventProps
      }
    }

    this.analytics.track(trackInfo)
  }
}

export const analytics = new Analytics()
