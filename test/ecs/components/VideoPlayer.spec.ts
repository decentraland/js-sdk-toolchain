import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('VideoPlayer component', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const VideoPlayer = components.VideoPlayer(newEngine)

    testComponentSerialization(VideoPlayer, {
      src: 'le-video.mp4',
      loop: true,
      playbackRate: 0.5,
      position: 65.3,
      playing: true,
      volume: 0.3
    })
  })
})
