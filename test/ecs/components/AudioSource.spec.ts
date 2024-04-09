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
      audioClipUrl: 'FakeUrl',
      currentTime: 1,
      global: true
    })

    testComponentSerialization(AudioSource, {
      playing: false,
      loop: false,
      volume: 0,
      pitch: 0,
      audioClipUrl: 'FakeUrl2',
      currentTime: 0,
      global: false
    })
  })

  it('should AudioSource.playSound and AudioSource.stopSound helper works properly', () => {
    const newEngine = Engine()
    const AudioSource = components.AudioSource(newEngine)
    const entity = newEngine.addEntity()
    const entityWithoutAudioSource = newEngine.addEntity()

    AudioSource.create(entity, {
      audioClipUrl: 'some-src',
      playing: true
    })

    expect(AudioSource.playSound(entityWithoutAudioSource, 'some-src')).toBe(false)
    expect(AudioSource.stopSound(entityWithoutAudioSource)).toBe(false)

    // play sound with new "src" & reset cursor
    expect(AudioSource.playSound(entity, 'other-src', true)).toBe(true)
    expect(AudioSource.getOrNull(entity)).toStrictEqual({ audioClipUrl: 'other-src', playing: true, currentTime: 0 })

    // change component's "currentTime"
    AudioSource.getMutable(entity).currentTime = 5

    // play sound without resetting cursor
    expect(AudioSource.playSound(entity, 'other-src', false)).toBe(true)
    expect(AudioSource.getOrNull(entity)).toStrictEqual({ audioClipUrl: 'other-src', playing: true, currentTime: 5 })

    // stop sound without resetting cursor
    expect(AudioSource.stopSound(entity, false)).toBe(true)
    expect(AudioSource.getOrNull(entity)).toStrictEqual({ audioClipUrl: 'other-src', playing: false, currentTime: 5 })

    // stop sound and reset cursor
    expect(AudioSource.stopSound(entity, true)).toBe(true)
    expect(AudioSource.getOrNull(entity)).toStrictEqual({ audioClipUrl: 'other-src', playing: false, currentTime: 0 })
  })
})
