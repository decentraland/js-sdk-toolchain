import * as components from '../components'
import { DeepReadonlyObject, Entity, IEngine } from '../engine'
import { PBAudioEvent } from '../components'
import { EntityState } from '../engine/entity'

/**
 * @public
 */
export type AudioEventsSystemCallback = (event: DeepReadonlyObject<PBAudioEvent>) => void

/**
 * @public
 */
export interface AudioEventsSystem {
  removeAudioEventsEntity(entity: Entity): void

  registerAudioEventsEntity(entity: Entity, callback: AudioEventsSystemCallback): void

  hasAudioEventsEntity(entity: Entity): boolean

  /**
   * Returns the latest state of the AudioEvent
   * @param entity - Entity to retrieve the audio status
   */
  getAudioState(entity: Entity): DeepReadonlyObject<PBAudioEvent> | undefined
}

/**
 * @internal
 */
export function createAudioEventsSystem(engine: IEngine): AudioEventsSystem {
  const audioSourceComponent = components.AudioSource(engine)
  const audioStreamComponent = components.AudioStream(engine)
  const audioEventComponent = components.AudioEvent(engine)
  const entitiesCallbackAudioStateMap = new Map<
    Entity,
    {
      callback: AudioEventsSystemCallback
      lastAudioState?: number
    }
  >()

  function registerAudioEventsEntity(entity: Entity, callback: AudioEventsSystemCallback) {
    // audio event component is not added here because the renderer adds it
    // to every entity with an AudioSource or AudioStream component
    entitiesCallbackAudioStateMap.set(entity, { callback: callback })
  }

  function removeAudioEventsEntity(entity: Entity) {
    entitiesCallbackAudioStateMap.delete(entity)
  }

  function hasAudioEventsEntity(entity: Entity) {
    return entitiesCallbackAudioStateMap.has(entity)
  }

  // @internal
  engine.addSystem(function AudioEventSystem() {
    for (const [entity, data] of entitiesCallbackAudioStateMap) {
      const hasAudioSource = audioSourceComponent.has(entity)
      const hasAudioStream = audioStreamComponent.has(entity)
      if (engine.getEntityState(entity) === EntityState.Removed || (!hasAudioSource && !hasAudioStream)) {
        removeAudioEventsEntity(entity)
        continue
      }

      // Compare with last state
      const audioEvent = audioEventComponent.get(entity)
      const values = Array.from(audioEvent.values())
      const lastValue = values[audioEvent.size - 1]

      if (lastValue === undefined || (data.lastAudioState !== undefined && data.lastAudioState === lastValue.state))
        continue

      data.callback(lastValue)

      entitiesCallbackAudioStateMap.set(entity, {
        callback: data.callback,
        lastAudioState: lastValue.state
      })
    }
  })

  return {
    removeAudioEventsEntity(entity: Entity) {
      removeAudioEventsEntity(entity)
    },
    registerAudioEventsEntity(entity: Entity, callback: AudioEventsSystemCallback) {
      registerAudioEventsEntity(entity, callback)
    },
    hasAudioEventsEntity(entity: Entity) {
      return hasAudioEventsEntity(entity)
    },
    getAudioState(entity: Entity) {
      const audioEvent = audioEventComponent.get(entity)
      const values = Array.from(audioEvent.values())
      const lastValue = values[audioEvent.size - 1]
      return lastValue
    }
  }
}
