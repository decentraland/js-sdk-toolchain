import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated AudioStream ProtoBuf', () => {
  it('should serialize/deserialize AudioStream', () => {
    const newEngine = Engine()
    const AudioStream = components.AudioStream(newEngine)

    testComponentSerialization(AudioStream, {
      playing: true,
      volume: 1,
      url: 'FakeUrl'
    })

    testComponentSerialization(AudioStream, {
      playing: false,
      volume: 0,
      url: 'FakeUrl2'
    })
  })
})
