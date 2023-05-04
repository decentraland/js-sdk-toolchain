import {
  components,
  createVideoEventsSystem,
  Engine,
  IEngine,
  VideoEventsSystem,
  VideoEvent
} from '../../packages/@dcl/ecs/src'

describe('Video events helper system should', () => {
  const engine: IEngine = Engine()
  const videoEventsSystem: VideoEventsSystem = createVideoEventsSystem(engine)
  const videoEventComponent = components.VideoEvent(engine)
  const videoPlayerComponent = components.VideoPlayer(engine)

  it('run callback on video status change', async () => {

  })

  it('remove video event component if video player component is removed first', async () => {

  })

  it('remove subscribed entity correctly', async () => {

  })

  it('handle deleted entities correctly', async () => {

  })
})
