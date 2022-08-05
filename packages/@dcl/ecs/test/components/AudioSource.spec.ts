import { ensureEngineAndComponents } from './utils'

describe('Generated AudioSource ProtoBuf', () => {
  it('should serialize/deserialize AudioSource', async () => {
    const {
      engine: newEngine,
      components: { AudioSource }
    } = await ensureEngineAndComponents()
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
    AudioSource.updateFromBinary(entityB, buffer)

    expect(_audioSource).toBeDeepCloseTo({ ...AudioSource.mutable(entityB) })

    expect(AudioSource.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...AudioSource.mutable(entity)
    })
  })
})
