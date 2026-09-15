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
  /**
   * Run `callback` every time the media state of the entity's audio changes (loading, ready, playing, ...).
   * Periodic playback-position reports that keep the same state do not trigger it; see `registerAudioPlaybackEntity`.
   */
  registerAudioEventsEntity(entity: Entity, callback: AudioEventsSystemCallback): void
  hasAudioEventsEntity(entity: Entity): boolean
  /**
   * Returns the latest state of the AudioEvent
   * @param entity - Entity to retrieve the audio status
   */
  getAudioState(entity: Entity): DeepReadonlyObject<PBAudioEvent> | undefined
  /**
   * Run `callback` for every report the renderer writes, including the periodic playback-position reports it
   * emits while a clip plays (`tickNumber` and `currentOffset`). Use this to align gameplay with the audio that
   * is actually heard: the renderer starts a clip some milliseconds after being asked to, so compare
   * `currentOffset` with the scene clock at `tickNumber`.
   */
  registerAudioPlaybackEntity(entity: Entity, callback: AudioEventsSystemCallback): void
  removeAudioPlaybackEntity(entity: Entity): void
  /**
   * Returns the latest report that carries a playback position (`currentOffset`), or undefined when the
   * renderer has not reported one yet. Renderers without position reports never resolve it.
   * @param entity - Entity with an AudioSource or AudioStream
   */
  getAudioPlayback(entity: Entity): DeepReadonlyObject<PBAudioEvent> | undefined
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
  const entitiesCallbackPlaybackMap = new Map<
    Entity,
    {
      callback: AudioEventsSystemCallback
      lastReport?: string
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

  function registerAudioPlaybackEntity(entity: Entity, callback: AudioEventsSystemCallback) {
    entitiesCallbackPlaybackMap.set(entity, { callback: callback })
  }

  function removeAudioPlaybackEntity(entity: Entity) {
    entitiesCallbackPlaybackMap.delete(entity)
  }

  function hasAudioComponent(entity: Entity) {
    return audioSourceComponent.has(entity) || audioStreamComponent.has(entity)
  }

  function latestReport(entity: Entity): DeepReadonlyObject<PBAudioEvent> | undefined {
    const audioEvent = audioEventComponent.get(entity)
    const values = Array.from(audioEvent.values())
    return values[audioEvent.size - 1]
  }

  // Two reports from the same tick with the same content are the same report, whatever their counter says.
  function reportKey(report: DeepReadonlyObject<PBAudioEvent>) {
    return `${report.timestamp}:${report.tickNumber ?? ''}:${report.currentOffset ?? ''}:${report.state}`
  }

  // @internal
  engine.addSystem(function AudioEventSystem() {
    for (const [entity, data] of entitiesCallbackAudioStateMap) {
      if (engine.getEntityState(entity) === EntityState.Removed || !hasAudioComponent(entity)) {
        removeAudioEventsEntity(entity)
        continue
      }

      // Compare with last state
      const lastValue = latestReport(entity)
      if (lastValue === undefined || (data.lastAudioState !== undefined && data.lastAudioState === lastValue.state))
        continue

      data.callback(lastValue)
      entitiesCallbackAudioStateMap.set(entity, {
        callback: data.callback,
        lastAudioState: lastValue.state
      })
    }

    for (const [entity, data] of entitiesCallbackPlaybackMap) {
      if (engine.getEntityState(entity) === EntityState.Removed || !hasAudioComponent(entity)) {
        removeAudioPlaybackEntity(entity)
        continue
      }

      const lastValue = latestReport(entity)
      if (lastValue === undefined) continue
      const key = reportKey(lastValue)
      if (data.lastReport === key) continue

      data.callback(lastValue)
      entitiesCallbackPlaybackMap.set(entity, { callback: data.callback, lastReport: key })
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
      return latestReport(entity)
    },
    registerAudioPlaybackEntity(entity: Entity, callback: AudioEventsSystemCallback) {
      registerAudioPlaybackEntity(entity, callback)
    },
    removeAudioPlaybackEntity(entity: Entity) {
      removeAudioPlaybackEntity(entity)
    },
    getAudioPlayback(entity: Entity) {
      const values = Array.from(audioEventComponent.get(entity).values())
      for (let index = values.length - 1; index >= 0; index--) {
        if (values[index].currentOffset !== undefined) return values[index]
      }
      return undefined
    }
  }
}
