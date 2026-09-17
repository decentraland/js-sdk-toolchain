import {
  components,
  createAudioEventsSystem,
  Engine,
  IEngine,
  AudioEventsSystem,
  MediaState,
  Entity
} from '../../../packages/@dcl/ecs/src'

describe('Audio events helper system should', () => {
  const engine: IEngine = Engine()
  const audioEventsSystem: AudioEventsSystem = createAudioEventsSystem(engine)
  const audioEventComponent = components.AudioEvent(engine)
  const audioSourceComponent = components.AudioSource(engine)
  const audioStreamComponent = components.AudioStream(engine)
  const engineInfoComponent = components.EngineInfo(engine)

  it('gets the latest state of an audio source', async () => {
    const audioSourceEntity = engine.addEntity()
    audioSourceComponent.create(audioSourceEntity)
    // simulate audio event attach in renderer
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_LOADING,
      timestamp: 1
    })
    await engine.update(1)
    const state = audioEventsSystem.getAudioState(audioSourceEntity)
    expect(state?.state).toBe(MediaState.MS_LOADING)
  })

  it('gets the latest state of an audio stream', async () => {
    const audioStreamEntity = engine.addEntity()
    audioStreamComponent.create(audioStreamEntity, { url: 'https://stream.example.com/radio' })
    // simulate audio event attach in renderer
    audioEventComponent.addValue(audioStreamEntity, {
      state: MediaState.MS_READY,
      timestamp: 1
    })
    await engine.update(1)
    const state = audioEventsSystem.getAudioState(audioStreamEntity)
    expect(state?.state).toBe(MediaState.MS_READY)
  })

  it('run callback on audio status change', async () => {
    const fn = jest.fn()

    const audioSourceEntity = engine.addEntity()
    audioSourceComponent.create(audioSourceEntity)
    // simulate audio event attach in renderer
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_LOADING,
      timestamp: 1
    })

    audioEventsSystem.registerAudioEventsEntity(audioSourceEntity, fn)

    // simulate audio state change in renderer
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_PLAYING,
      timestamp: 2
    })

    await engine.update(1)

    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ state: MediaState.MS_PLAYING, timestamp: 2 }))
  })

  it('run callback once per status change', async () => {
    const fn = jest.fn()

    const audioSourceEntity = engine.addEntity()
    audioSourceComponent.create(audioSourceEntity)
    // simulate audio event attach in renderer
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_LOADING,
      timestamp: 1
    })

    audioEventsSystem.registerAudioEventsEntity(audioSourceEntity, fn)

    // simulate audio state change in renderer
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_PLAYING,
      timestamp: 2
    })

    await engine.update(1)

    // same state added again, no additional callback should fire
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_PLAYING,
      timestamp: 3
    })

    await engine.update(1)
    await engine.update(1)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('run callback for an entity with an AudioStream component instead of AudioSource', async () => {
    const fn = jest.fn()

    const audioStreamEntity = engine.addEntity()
    audioStreamComponent.create(audioStreamEntity, { url: 'https://stream.example.com/radio' })
    // simulate audio event attach in renderer
    audioEventComponent.addValue(audioStreamEntity, {
      state: MediaState.MS_LOADING,
      timestamp: 1
    })

    audioEventsSystem.registerAudioEventsEntity(audioStreamEntity, fn)

    // simulate audio state change in renderer
    audioEventComponent.addValue(audioStreamEntity, {
      state: MediaState.MS_PLAYING,
      timestamp: 2
    })

    await engine.update(1)

    expect(fn).toHaveBeenCalled()
  })

  it('remove subscribed entity when AudioSource is removed', async () => {
    const fn = jest.fn()

    const audioSourceEntity = engine.addEntity()
    audioSourceComponent.create(audioSourceEntity)
    // simulate audio event attach in renderer
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_LOADING,
      timestamp: 1
    })

    audioEventsSystem.registerAudioEventsEntity(audioSourceEntity, fn)
    expect(audioEventsSystem.hasAudioEventsEntity(audioSourceEntity)).toBe(true)

    audioSourceComponent.deleteFrom(audioSourceEntity)

    await engine.update(1)

    expect(fn).toHaveBeenCalledTimes(0)
    expect(audioEventsSystem.hasAudioEventsEntity(audioSourceEntity)).toBe(false)
  })

  it('remove subscribed entity when AudioStream is removed', async () => {
    const fn = jest.fn()

    const audioStreamEntity = engine.addEntity()
    audioStreamComponent.create(audioStreamEntity, { url: 'https://stream.example.com/radio' })
    // simulate audio event attach in renderer
    audioEventComponent.addValue(audioStreamEntity, {
      state: MediaState.MS_LOADING,
      timestamp: 1
    })

    audioEventsSystem.registerAudioEventsEntity(audioStreamEntity, fn)
    expect(audioEventsSystem.hasAudioEventsEntity(audioStreamEntity)).toBe(true)

    audioStreamComponent.deleteFrom(audioStreamEntity)

    await engine.update(1)

    expect(fn).toHaveBeenCalledTimes(0)
    expect(audioEventsSystem.hasAudioEventsEntity(audioStreamEntity)).toBe(false)
  })

  it('keep subscribed entity that has both AudioSource and AudioStream when only one is removed', async () => {
    const fn = jest.fn()

    const entity = engine.addEntity()
    audioSourceComponent.create(entity)
    audioStreamComponent.create(entity, { url: 'https://stream.example.com/radio' })
    audioEventComponent.addValue(entity, {
      state: MediaState.MS_LOADING,
      timestamp: 1
    })

    audioEventsSystem.registerAudioEventsEntity(entity, fn)
    expect(audioEventsSystem.hasAudioEventsEntity(entity)).toBe(true)

    // only remove one of the two components; the entity is still alive for our purposes
    audioStreamComponent.deleteFrom(entity)

    await engine.update(1)

    expect(audioEventsSystem.hasAudioEventsEntity(entity)).toBe(true)
  })

  it('remove subscribed entity correctly', async () => {
    const audioSourceEntity = engine.addEntity()
    audioSourceComponent.create(audioSourceEntity)
    // simulate audio event attach in renderer
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_LOADING,
      timestamp: 1
    })

    audioEventsSystem.registerAudioEventsEntity(audioSourceEntity, () => {})
    expect(audioEventsSystem.hasAudioEventsEntity(audioSourceEntity)).toBe(true)

    audioEventsSystem.removeAudioEventsEntity(audioSourceEntity)
    expect(audioEventsSystem.hasAudioEventsEntity(audioSourceEntity)).toBe(false)
  })

  it('handle deleted entities correctly', async () => {
    const audioSourceEntity = engine.addEntity()
    audioSourceComponent.create(audioSourceEntity)
    // simulate audio event attach in renderer
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_LOADING,
      timestamp: 1
    })

    audioEventsSystem.registerAudioEventsEntity(audioSourceEntity, () => {})
    expect(audioEventsSystem.hasAudioEventsEntity(audioSourceEntity)).toBe(true)

    engine.removeEntity(audioSourceEntity)

    await engine.update(1)

    expect(audioEventsSystem.hasAudioEventsEntity(audioSourceEntity)).toBe(false)
  })

  it('runs playback callbacks on position reports even when the state does not change', async () => {
    const fn = jest.fn()
    const audioSourceEntity = engine.addEntity()
    audioSourceComponent.create(audioSourceEntity)
    audioEventsSystem.registerAudioPlaybackEntity(audioSourceEntity, fn)
    // simulate the renderer reporting the start of playback, then two periodic position reports
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_PLAYING,
      timestamp: 1,
      tickNumber: 1,
      currentOffset: 0.02
    })
    await engine.update(1)
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_PLAYING,
      timestamp: 2,
      tickNumber: 16,
      currentOffset: 0.52
    })
    await engine.update(1)
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_PLAYING,
      timestamp: 3,
      tickNumber: 31,
      currentOffset: 1.02
    })
    await engine.update(1)
    await engine.update(1)
    expect(fn).toHaveBeenCalledTimes(3)
    expect(fn).toHaveBeenLastCalledWith(expect.objectContaining({ tickNumber: 31, currentOffset: 1.02 }))
  })

  it('does not run state callbacks on position-only reports', async () => {
    const fn = jest.fn()
    const audioSourceEntity = engine.addEntity()
    audioSourceComponent.create(audioSourceEntity)
    audioEventsSystem.registerAudioEventsEntity(audioSourceEntity, fn)
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_PLAYING,
      timestamp: 1,
      tickNumber: 1,
      currentOffset: 0
    })
    await engine.update(1)
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_PLAYING,
      timestamp: 2,
      tickNumber: 16,
      currentOffset: 0.5
    })
    await engine.update(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('returns the latest report that carries a playback position', async () => {
    const audioSourceEntity = engine.addEntity()
    audioSourceComponent.create(audioSourceEntity)
    audioEventComponent.addValue(audioSourceEntity, { state: MediaState.MS_LOADING, timestamp: 1 })
    audioEventComponent.addValue(audioSourceEntity, {
      state: MediaState.MS_PLAYING,
      timestamp: 2,
      tickNumber: 4,
      currentOffset: 0.1,
      clipLength: 64
    })
    audioEventComponent.addValue(audioSourceEntity, { state: MediaState.MS_PAUSED, timestamp: 3 })
    await engine.update(1)
    expect(audioEventsSystem.getAudioPlayback(audioSourceEntity)).toEqual(
      expect.objectContaining({ tickNumber: 4, currentOffset: 0.1, clipLength: 64 })
    )
    expect(audioEventsSystem.getAudioState(audioSourceEntity)?.state).toBe(MediaState.MS_PAUSED)
  })

  it('returns undefined when no report carried a playback position', async () => {
    const audioSourceEntity = engine.addEntity()
    audioSourceComponent.create(audioSourceEntity)
    audioEventComponent.addValue(audioSourceEntity, { state: MediaState.MS_LOADING, timestamp: 1 })
    await engine.update(1)
    expect(audioEventsSystem.getAudioPlayback(audioSourceEntity)).toBeUndefined()
  })

  describe('when reports are resolved against the scene clock', () => {
    let fn: jest.Mock
    let audioSourceEntity: Entity
    beforeEach(async () => {
      fn = jest.fn()
      audioSourceEntity = engine.addEntity()
      audioSourceComponent.create(audioSourceEntity)
      audioEventsSystem.registerAudioPlaybackSampleEntity(audioSourceEntity, fn)
      // three ticks of 0.1 s each: tick 1 at 0.1 s, tick 2 at 0.2 s, tick 3 at 0.3 s
      for (const tick of [1, 2, 3]) {
        engineInfoComponent.createOrReplace(engine.RootEntity, {
          frameNumber: tick,
          totalRuntime: tick / 10,
          tickNumber: tick,
          sceneHidden: false
        })
        await engine.update(0.1)
      }
    })
    afterEach(() => {
      audioEventsSystem.removeAudioPlaybackSampleEntity(audioSourceEntity)
    })

    it('should record the scene clock for each tick', () => {
      const t1 = audioEventsSystem.getSceneTimeAtTick(1)!
      const t3 = audioEventsSystem.getSceneTimeAtTick(3)!
      expect(t3 - t1).toBeCloseTo(0.2)
    })

    it('should resolve a late report against the clock at the tick it was sampled in', async () => {
      // sampled at tick 2 (scene clock 0.2 s), delivered two ticks later
      audioEventComponent.addValue(audioSourceEntity, {
        state: MediaState.MS_PLAYING,
        timestamp: 1,
        tickNumber: 2,
        currentOffset: 0.05
      })
      engineInfoComponent.createOrReplace(engine.RootEntity, {
        frameNumber: 4,
        totalRuntime: 0.4,
        tickNumber: 4,
        sceneHidden: false
      })
      await engine.update(0.1)
      expect(fn).toHaveBeenCalledWith(
        expect.objectContaining({ sceneTime: audioEventsSystem.getSceneTimeAtTick(2), offset: 0.05 })
      )
    })

    describe('and every report names a tick the history never recorded', () => {
      let clockBeforeReports: number
      beforeEach(async () => {
        clockBeforeReports = audioEventsSystem.getSceneTimeAtTick(3)!
        // A renderer stamping a tick the scene never sees must not silence the feature: it would drop
        // every sample, not just one, because a report is marked as seen once it has been examined.
        for (const [timestamp, currentOffset] of [
          [1, 0.05],
          [2, 0.15]
        ]) {
          audioEventComponent.addValue(audioSourceEntity, {
            state: MediaState.MS_PLAYING,
            timestamp,
            tickNumber: 900 + timestamp,
            currentOffset
          })
          await engine.update(0.1)
        }
      })

      it('should deliver every report instead of dropping it', () => {
        expect(fn).toHaveBeenCalledTimes(2)
      })

      it('should fall back to the scene clock of the frame that received each report', () => {
        const elapsed = fn.mock.calls.map((call) => Number((call[0].sceneTime - clockBeforeReports).toFixed(2)))
        expect(elapsed).toEqual([0.1, 0.2])
      })

      it('should still carry the position the renderer sampled', () => {
        expect(fn.mock.calls.map((call) => call[0].offset)).toEqual([0.05, 0.15])
      })
    })

    it('should skip state-only reports', async () => {
      audioEventComponent.addValue(audioSourceEntity, { state: MediaState.MS_PLAYING, timestamp: 1 })
      await engine.update(0.1)
      expect(fn).not.toHaveBeenCalled()
    })
  })
})
