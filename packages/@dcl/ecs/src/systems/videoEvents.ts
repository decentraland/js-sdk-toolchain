import * as components from '../components'
import { DeepReadonlyObject, Entity, IEngine } from "../engine";
import { PBVideoEvent } from "../components";
import { EntityState } from "../engine/entity";

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
  const entitiesCallbackVideoStateMap = new Map<Entity, {
    callback: VideoEventsSystemCallback,
    lastVideoState?: number
  }>()

  function registerVideoEventsEntity (entity: Entity, callback: VideoEventsSystemCallback) {
    videoEventComponent.getOrCreateMutable(entity)
    entitiesCallbackVideoStateMap.set(entity, { callback: callback })
  }

  function removeVideoEventsEntity (entity: Entity) {
    entitiesCallbackVideoStateMap.delete(entity)
    videoEventComponent.deleteFrom(entity)
  }

  // @internal
  engine.addSystem(function EventSystem() {
    for (const [entity, data] of entitiesCallbackVideoStateMap) {
      const videoPlayer = videoPlayerComponent.getOrNull(entity)
      if (engine.getEntityState(entity) === EntityState.Removed || !videoPlayer) {
        entitiesCallbackVideoStateMap.delete(entity)
        continue
      }

      const videoEvent = videoEventComponent.getOrNull(entity)
      if (!videoEvent || (data.lastVideoState != undefined && data.lastVideoState == videoEvent.state)) continue

      data.callback(videoEvent)
      entitiesCallbackVideoStateMap.set(entity, {
        callback: data.callback,
        lastVideoState: videoEvent.state // save state
      })
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
