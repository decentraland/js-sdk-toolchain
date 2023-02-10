import { Engine, components } from '../../../packages/@dcl/ecs/src'

describe('Generated AudioSource ProtoBuf', () => {
  it('should serialize/deserialize AudioSource', () => {
    const newEngine = Engine()
    const AudioSource = components.AudioSource(newEngine)
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _audioSource = AudioSource.create(entity, {
      playing: true,
      loop: true,
      volume: 1,
      pitch: 1,
      audioClipUrl: 'FakeUrl'
    })

    AudioSource.create(entityB, {
      playing: false,
      loop: false,
      volume: 0,
      pitch: 0,
      audioClipUrl: 'FakeUrl2'
    })
    const buffer = AudioSource.toBinary(entity)
    AudioSource.upsertFromBinary(entityB, buffer)

    expect(_audioSource).toBeDeepCloseTo({
      ...AudioSource.getMutable(entityB)
    })

    expect(AudioSource.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...AudioSource.getMutable(entity)
    })
  })
})
