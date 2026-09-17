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
 * A playback report resolved against the scene's own clock. `sceneTime` is the scene clock (seconds since the
 * scene started, from the engine's accumulated delta time) in the tick the renderer sampled the position, so it
 * does not depend on how long the report took to arrive. `offset` is `currentOffset` in seconds.
 *
 * `sceneTime - offset` is the scene clock at which the clip effectively began, not a lag. To get the lag, compare
 * it against the moment the scene believes it started the clip: `(sceneTime - songStart) - offset`, positive when
 * the audible clip runs behind the scene.
 *
 * Accuracy is bounded by how often the renderer samples its playhead and by the renderer's output latency, which
 * is the gap between the decoder position reported here and the moment a sample leaves the speaker. The latter is
 * typically tens of milliseconds and roughly constant per device, so a scene needing finer alignment than a tick
 * should calibrate it once rather than expect it here.
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
   * Run `callback` once per scene frame with the newest report for the entity, including the playback-position
   * reports the renderer writes while a clip plays (`tickNumber` and `currentOffset`). It is skipped on frames
   * where no new report arrived. A renderer sampling faster than the scene ticks appends several reports per
   * frame; the callback receives the freshest, which is the one to align against.
   *
   * Use this to align gameplay with the audio that is actually heard: the renderer starts a clip some
   * milliseconds after being asked to, so compare `currentOffset` with the scene clock at `tickNumber`.
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
   * Same delivery as `registerAudioPlaybackEntity`, with the report already resolved against the scene clock at
   * the tick it was sampled in. This is the form most scenes want, because comparing against the clock at that
   * tick keeps the time the report spent in transit out of the result.
   *
   * See {@link AudioPlaybackSample} for what the two numbers mean and what accuracy to expect. When the report's
   * tick predates the short history the system keeps, the current scene clock is used instead; a report is never
   * dropped for want of a matching tick.
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

      // A renderer publishes EngineInfo and the reports sampled in that tick together, so the tick is normally
      // already recorded. When it is not, the current clock is the closest the scene has: resolving to it keeps
      // the report flowing, where looking the tick up after marking it seen would drop it for good.
      const sceneTimeAtTick = sceneTimeByTick.get(lastValue.tickNumber) ?? sceneTime
      entitiesCallbackSampleMap.set(entity, { callback: data.callback, lastReport: key })
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
