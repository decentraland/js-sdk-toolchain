import * as components from '../components'
import { DeepReadonlyObject, Entity, IEngine } from '../engine'
import { PBVideoEvent } from '../components'
import { EntityState } from '../engine/entity'

/**
 * @public
 */
export type VideoEventsSystemCallback = (event: DeepReadonlyObject<PBVideoEvent>) => void

/**
 * @public
 */
export interface VideoEventsSystem {
  removeVideoEventsEntity(entity: Entity): void

  registerVideoEventsEntity(entity: Entity, callback: VideoEventsSystemCallback): void

  hasVideoEventsEntity(entity: Entity): boolean

  /**
   * Returns the latest state of the VideoEvent
   * @param entity - Entity to retrieve the video status
   */
  getVideoState(entity: Entity): DeepReadonlyObject<PBVideoEvent> | undefined
}

/**
 * @internal
 */
export function createVideoEventsSystem(engine: IEngine): VideoEventsSystem {
  const videoPlayerComponent = components.VideoPlayer(engine)
  const videoEventComponent = components.VideoEvent(engine)
  const entitiesCallbackVideoStateMap = new Map<
    Entity,
    {
      callback: VideoEventsSystemCallback
      lastVideoState?: number
    }
  >()

  function registerVideoEventsEntity(entity: Entity, callback: VideoEventsSystemCallback) {
    // video event component is not added here because the renderer adds it
    // to every entity with a VideoPlayer component
    entitiesCallbackVideoStateMap.set(entity, { callback: callback })
  }

  function removeVideoEventsEntity(entity: Entity) {
    entitiesCallbackVideoStateMap.delete(entity)
  }

  function hasVideoEventsEntity(entity: Entity) {
    return entitiesCallbackVideoStateMap.has(entity)
  }

  // @internal
  engine.addSystem(function EventSystem() {
    for (const [entity, data] of entitiesCallbackVideoStateMap) {
      const videoPlayer = videoPlayerComponent.getOrNull(entity)
      if (engine.getEntityState(entity) === EntityState.Removed || !videoPlayer) {
        removeVideoEventsEntity(entity)
        continue
      }

      // Compare with last state
      const videoEvent = videoEventComponent.get(entity)
      const values = Array.from(videoEvent.values())
      const lastValue = values[videoEvent.size - 1]

      if (lastValue === undefined || (data.lastVideoState !== undefined && data.lastVideoState === lastValue.state))
        continue

      data.callback(lastValue)

      entitiesCallbackVideoStateMap.set(entity, {
        callback: data.callback,
        lastVideoState: lastValue.state
      })
    }
  })

  return {
    removeVideoEventsEntity(entity: Entity) {
      removeVideoEventsEntity(entity)
    },
    registerVideoEventsEntity(entity: Entity, callback: VideoEventsSystemCallback) {
      registerVideoEventsEntity(entity, callback)
    },
    hasVideoEventsEntity(entity: Entity) {
      return hasVideoEventsEntity(entity)
    },
    getVideoState(entity: Entity) {
      const videoEvent = videoEventComponent.get(entity)
      const values = Array.from(videoEvent.values())
      const lastValue = values[videoEvent.size - 1]
      return lastValue
    }
  }
}
