import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated AudioSource ProtoBuf', () => {
  it('should serialize/deserialize AudioSource', () => {
    const newEngine = Engine()
    const AudioSource = components.AudioSource(newEngine)

    testComponentSerialization(AudioSource, {
      playing: true,
      loop: true,
      volume: 1,
      pitch: 1,
      audioClipUrl: 'FakeUrl'
    })

    testComponentSerialization(AudioSource, {
      playing: false,
      loop: false,
      volume: 0,
      pitch: 0,
      audioClipUrl: 'FakeUrl2'
    })
  })
})
