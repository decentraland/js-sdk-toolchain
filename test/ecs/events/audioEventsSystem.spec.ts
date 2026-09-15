import {
  components,
  createAudioEventsSystem,
  Engine,
  IEngine,
  AudioEventsSystem,
  MediaState
} from '../../../packages/@dcl/ecs/src'

describe('Audio events helper system should', () => {
  const engine: IEngine = Engine()
  const audioEventsSystem: AudioEventsSystem = createAudioEventsSystem(engine)
  const audioEventComponent = components.AudioEvent(engine)
  const audioSourceComponent = components.AudioSource(engine)
  const audioStreamComponent = components.AudioStream(engine)

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
    audioEventComponent.addValue(audioSourceEntity, { state: MediaState.MS_PLAYING, timestamp: 1, tickNumber: 1, currentOffset: 0.02 })
    await engine.update(1)
    audioEventComponent.addValue(audioSourceEntity, { state: MediaState.MS_PLAYING, timestamp: 2, tickNumber: 16, currentOffset: 0.52 })
    await engine.update(1)
    audioEventComponent.addValue(audioSourceEntity, { state: MediaState.MS_PLAYING, timestamp: 3, tickNumber: 31, currentOffset: 1.02 })
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
    audioEventComponent.addValue(audioSourceEntity, { state: MediaState.MS_PLAYING, timestamp: 1, tickNumber: 1, currentOffset: 0 })
    await engine.update(1)
    audioEventComponent.addValue(audioSourceEntity, { state: MediaState.MS_PLAYING, timestamp: 2, tickNumber: 16, currentOffset: 0.5 })
    await engine.update(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('returns the latest report that carries a playback position', async () => {
    const audioSourceEntity = engine.addEntity()
    audioSourceComponent.create(audioSourceEntity)
    audioEventComponent.addValue(audioSourceEntity, { state: MediaState.MS_LOADING, timestamp: 1 })
    audioEventComponent.addValue(audioSourceEntity, { state: MediaState.MS_PLAYING, timestamp: 2, tickNumber: 4, currentOffset: 0.1, clipLength: 64 })
    audioEventComponent.addValue(audioSourceEntity, { state: MediaState.MS_PAUSED, timestamp: 3 })
    await engine.update(1)
    expect(audioEventsSystem.getAudioPlayback(audioSourceEntity)).toEqual(expect.objectContaining({ tickNumber: 4, currentOffset: 0.1, clipLength: 64 }))
    expect(audioEventsSystem.getAudioState(audioSourceEntity)?.state).toBe(MediaState.MS_PAUSED)
  })

  it('returns undefined when no report carried a playback position', async () => {
    const audioSourceEntity = engine.addEntity()
    audioSourceComponent.create(audioSourceEntity)
    audioEventComponent.addValue(audioSourceEntity, { state: MediaState.MS_LOADING, timestamp: 1 })
    await engine.update(1)
    expect(audioEventsSystem.getAudioPlayback(audioSourceEntity)).toBeUndefined()
  })
})

