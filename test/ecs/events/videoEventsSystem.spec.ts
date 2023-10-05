import {
  components,
  createVideoEventsSystem,
  Engine,
  IEngine,
  VideoEventsSystem,
  VideoState
} from '../../../packages/@dcl/ecs/src'

describe('Video events helper system should', () => {
  const engine: IEngine = Engine()
  const videoEventsSystem: VideoEventsSystem = createVideoEventsSystem(engine)
  const videoEventComponent = components.VideoEvent(engine)
  const videoPlayerComponent = components.VideoPlayer(engine)

  it('gets the latest state of a video', async () => {
    const videoPlayerEntity = engine.addEntity()
    videoPlayerComponent.create(videoPlayerEntity)
    // simulate video event attach in renderer
    videoEventComponent.addValue(videoPlayerEntity, {
      state: VideoState.VS_LOADING,
      currentOffset: 0,
      videoLength: 5,
      timestamp: 1,
      tickNumber: 1
    })
    await engine.update(1)
    const state = videoEventsSystem.getVideoState(videoPlayerEntity)
    expect(state?.state).toBe(VideoState.VS_LOADING)
  })

  it('run callback on video status change', async () => {
    const fn = jest.fn()

    const videoPlayerEntity = engine.addEntity()
    videoPlayerComponent.create(videoPlayerEntity)
    // simulate video event attach in renderer
    videoEventComponent.addValue(videoPlayerEntity, {
      state: VideoState.VS_LOADING,
      currentOffset: 0,
      videoLength: 5,
      timestamp: 1,
      tickNumber: 1
    })

    videoEventsSystem.registerVideoEventsEntity(videoPlayerEntity, fn)

    // simulate video state change in renderer
    videoEventComponent.addValue(videoPlayerEntity, {
      state: VideoState.VS_PLAYING,
      currentOffset: 1,
      videoLength: 5,
      timestamp: 2,
      tickNumber: 1
    })

    await engine.update(1)

    expect(fn).toHaveBeenCalled()
  })

  it('run callback once per status change', async () => {
    const fn = jest.fn()

    const videoPlayerEntity = engine.addEntity()
    videoPlayerComponent.create(videoPlayerEntity)
    // simulate video event attach in renderer
    videoEventComponent.addValue(videoPlayerEntity, {
      state: VideoState.VS_LOADING,
      currentOffset: 0,
      videoLength: 5,
      timestamp: 1,
      tickNumber: 1
    })

    videoEventsSystem.registerVideoEventsEntity(videoPlayerEntity, fn)

    // simulate video state change in renderer
    videoEventComponent.addValue(videoPlayerEntity, {
      state: VideoState.VS_PLAYING,
      currentOffset: 1,
      videoLength: 5,
      timestamp: 2,
      tickNumber: 2
    })

    await engine.update(1)

    videoEventComponent.addValue(videoPlayerEntity, {
      state: VideoState.VS_PLAYING,
      currentOffset: 1,
      videoLength: 5,
      timestamp: 2,
      tickNumber: 3
    })

    await engine.update(1)
    await engine.update(1)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('remove subscribed entity when video player is removed', async () => {
    const fn = jest.fn()

    const videoPlayerEntity = engine.addEntity()
    videoPlayerComponent.create(videoPlayerEntity)
    // simulate video event attach in renderer
    videoEventComponent.addValue(videoPlayerEntity, {
      state: VideoState.VS_LOADING,
      currentOffset: 0,
      videoLength: 5,
      timestamp: 1,
      tickNumber: 1
    })

    videoEventsSystem.registerVideoEventsEntity(videoPlayerEntity, fn)
    expect(videoEventsSystem.hasVideoEventsEntity(videoPlayerEntity)).toBe(true)

    videoPlayerComponent.deleteFrom(videoPlayerEntity)

    await engine.update(1)

    expect(fn).toBeCalledTimes(0)
    expect(videoEventsSystem.hasVideoEventsEntity(videoPlayerEntity)).toBe(false)
  })

  it('remove subscribed entity correctly', async () => {
    const videoPlayerEntity = engine.addEntity()
    videoPlayerComponent.create(videoPlayerEntity)
    // simulate video event attach in renderer
    videoEventComponent.addValue(videoPlayerEntity, {
      state: VideoState.VS_LOADING,
      currentOffset: 0,
      videoLength: 5,
      timestamp: 1,
      tickNumber: 1
    })

    videoEventsSystem.registerVideoEventsEntity(videoPlayerEntity, () => {})
    expect(videoEventsSystem.hasVideoEventsEntity(videoPlayerEntity)).toBe(true)

    videoEventsSystem.removeVideoEventsEntity(videoPlayerEntity)
    expect(videoEventsSystem.hasVideoEventsEntity(videoPlayerEntity)).toBe(false)
  })

  it('handle deleted entities correctly', async () => {
    const videoPlayerEntity = engine.addEntity()
    videoPlayerComponent.create(videoPlayerEntity)
    // simulate video event attach in renderer
    videoEventComponent.addValue(videoPlayerEntity, {
      state: VideoState.VS_LOADING,
      currentOffset: 0,
      videoLength: 5,
      timestamp: 1,
      tickNumber: 1
    })

    videoEventsSystem.registerVideoEventsEntity(videoPlayerEntity, () => {})
    expect(videoEventsSystem.hasVideoEventsEntity(videoPlayerEntity)).toBe(true)

    engine.removeEntity(videoPlayerEntity)

    await engine.update(1)

    expect(videoEventsSystem.hasVideoEventsEntity(videoPlayerEntity)).toBe(false)
  })
})
