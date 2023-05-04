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
}

/**
 * @internal
 */
export function createVideoEventsSystem(engine: IEngine): VideoEventsSystem {
  const videoPlayerComponent = components.VideoPlayer(engine)
  const videoEventComponent = components.VideoEvent(engine)
  const entitiesCallbackVideoStateMap = new Map<Entity, VideoEventsSystemCallback>()

  function registerVideoEventsEntity(entity: Entity, callback: VideoEventsSystemCallback) {
    // video event component is not added here because the renderer adds it
    // to every entity with a VideoPlayer component
    entitiesCallbackVideoStateMap.set(entity, callback)
  }

  function removeVideoEventsEntity(entity: Entity) {
    entitiesCallbackVideoStateMap.delete(entity)
  }

  // @internal
  engine.addSystem(function EventSystem() {
    for (const [entity, callback] of entitiesCallbackVideoStateMap) {
      const videoPlayer = videoPlayerComponent.getOrNull(entity)
      if (engine.getEntityState(entity) === EntityState.Removed || !videoPlayer) {
        removeVideoEventsEntity(entity)
        continue
      }

      // Compare with last state
      const videoEvent = videoEventComponent.get(entity)
      const values = videoEvent.values()
      const valuesAmount = videoEvent.size
      let lastVideoEvent = undefined
      let newVideoEvent = undefined
      let index = 0
      for (let value of values) {
        if (index == valuesAmount-2)
          lastVideoEvent = value
        else if (index == valuesAmount-1)
          newVideoEvent = value

        index++
      }
      if (!newVideoEvent || (lastVideoEvent && lastVideoEvent.state == newVideoEvent.state)) continue

      callback(newVideoEvent)
    }
  })

  return {
    removeVideoEventsEntity(entity: Entity) {
      removeVideoEventsEntity(entity)
    },
    registerVideoEventsEntity(entity: Entity, callback: VideoEventsSystemCallback) {
      registerVideoEventsEntity(entity, callback)
    }
  }
}
