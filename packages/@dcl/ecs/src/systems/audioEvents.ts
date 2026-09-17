import * as components from '../components'
import { DeepReadonlyObject, Entity, IEngine } from '../engine'
import { PBAudioEvent } from '../components'
import { EntityState } from '../engine/entity'
import { SYSTEMS_REGULAR_PRIORITY } from '../engine/systems'

/**
 * @public
 */
export type AudioEventsSystemCallback = (event: DeepReadonlyObject<PBAudioEvent>) => void

/**
 * A playback report resolved against the scene's own clock: `sceneTime` is the value of the scene clock (seconds
 * since the scene started, from the engine's accumulated delta time) in the tick the renderer sampled the position.
 * `offset` is `currentOffset` in seconds. Comparing the two gives how far the audible clip runs behind (positive)
 * or ahead of the scene clock, independent of how long the report took to arrive.
 * @public
 */
export type AudioPlaybackSample = {
  report: DeepReadonlyObject<PBAudioEvent>
  sceneTime: number
  offset: number
}
/**
 * @public
 */
export type AudioPlaybackSampleCallback = (sample: AudioPlaybackSample) => void

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
  /**
   * Run `callback` for every position report, already resolved against the scene clock at the report's tick.
   * This is the form most scenes want: `sample.sceneTime - sample.offset` is the audio lag, with the report's
   * transport delay cancelled out by construction. Reports whose tick is no longer in the short history the
   * system keeps (about three seconds) are skipped.
   */
  registerAudioPlaybackSampleEntity(entity: Entity, callback: AudioPlaybackSampleCallback): void
  removeAudioPlaybackSampleEntity(entity: Entity): void
  /**
   * The scene clock (seconds, from accumulated delta time) recorded in the given tick, or undefined if that tick
   * is older than the history window or has not happened yet. Lets a scene resolve video reports the same way.
   */
  getSceneTimeAtTick(tickNumber: number): number | undefined
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
  const entitiesCallbackSampleMap = new Map<
    Entity,
    {
      callback: AudioPlaybackSampleCallback
      lastReport?: string
    }
  >()

  // Scene clock per tick. A report says where the clip was at tick N but reaches the scene a few ticks later, so
  // the scene clock must be looked up at N, not read when the report is processed. Kept for a few seconds.
  const TICK_HISTORY = 128
  const sceneTimeByTick = new Map<number, number>()
  let sceneTime = 0
  const engineInfo = components.EngineInfo(engine)
  engine.addSystem(
    function AudioEventsClockSystem(dt: number) {
      sceneTime += dt
      const tick = engineInfo.getOrNull(engine.RootEntity)?.tickNumber
      if (tick === undefined) return
      sceneTimeByTick.set(tick, sceneTime)
      if (sceneTimeByTick.size > TICK_HISTORY) {
        const oldest = sceneTimeByTick.keys().next().value
        if (oldest !== undefined) sceneTimeByTick.delete(oldest)
      }
    },
    // Runs before the report delivery below so the current tick's clock exists when a report for it arrives
    SYSTEMS_REGULAR_PRIORITY + 1
  )

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

  function registerAudioPlaybackSampleEntity(entity: Entity, callback: AudioPlaybackSampleCallback) {
    entitiesCallbackSampleMap.set(entity, { callback: callback })
  }

  function removeAudioPlaybackSampleEntity(entity: Entity) {
    entitiesCallbackSampleMap.delete(entity)
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

    for (const [entity, data] of entitiesCallbackSampleMap) {
      if (engine.getEntityState(entity) === EntityState.Removed || !hasAudioComponent(entity)) {
        removeAudioPlaybackSampleEntity(entity)
        continue
      }

      const lastValue = latestReport(entity)
      if (lastValue === undefined || lastValue.currentOffset === undefined || lastValue.tickNumber === undefined)
        continue
      const key = reportKey(lastValue)
      if (data.lastReport === key) continue
      entitiesCallbackSampleMap.set(entity, { callback: data.callback, lastReport: key })

      const sceneTimeAtTick = sceneTimeByTick.get(lastValue.tickNumber)
      if (sceneTimeAtTick === undefined) continue
      data.callback({ report: lastValue, sceneTime: sceneTimeAtTick, offset: lastValue.currentOffset })
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
    },
    registerAudioPlaybackSampleEntity(entity: Entity, callback: AudioPlaybackSampleCallback) {
      registerAudioPlaybackSampleEntity(entity, callback)
    },
    removeAudioPlaybackSampleEntity(entity: Entity) {
      removeAudioPlaybackSampleEntity(entity)
    },
    getSceneTimeAtTick(tickNumber: number) {
      return sceneTimeByTick.get(tickNumber)
    }
  }
}
