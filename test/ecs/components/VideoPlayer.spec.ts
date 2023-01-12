import { Engine, components } from '../../../packages/@dcl/ecs/src'

describe('VideoPlayer component', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const VideoPlayer = components.VideoPlayer(newEngine)
    const entity = newEngine.addEntity()

    VideoPlayer.create(entity, {
      src: 'le-video.mp4'
    })

    const buffer = VideoPlayer.toBinary(entity)
    VideoPlayer.upsertFromBinary(entity, buffer)
    const entityB = newEngine.addEntity()
    expect(VideoPlayer.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...VideoPlayer.get(entity)
    })
  })
})
