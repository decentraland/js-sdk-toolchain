import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { CrdtMessageType } from '../../../packages/@dcl/ecs/src/serialization/crdt/types'
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

    // stopSound on an entity without AudioSource is a no-op.
    expect(AudioSource.stopSound(entityWithoutAudioSource)).toBe(false)
    expect(AudioSource.getOrNull(entityWithoutAudioSource)).toBeNull()

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

  it('should create the AudioSource component on entities that do not yet have one when playSound is called', () => {
    const newEngine = Engine()
    const AudioSource = components.AudioSource(newEngine)
    const entity = newEngine.addEntity()

    // Entity has no AudioSource component yet.
    expect(AudioSource.getOrNull(entity)).toBeNull()

    // playSound must create it and start playback.
    expect(AudioSource.playSound(entity, 'fresh.mp3')).toBe(true)
    expect(AudioSource.getOrNull(entity)).toStrictEqual({
      audioClipUrl: 'fresh.mp3',
      playing: true,
      currentTime: 0
    })

    // And it must emit a CRDT PUT so the renderer hears about it.
    const messages = Array.from(AudioSource.getCrdtUpdates())
    expect(messages).toHaveLength(1)
    expect(messages[0].type).toBe(CrdtMessageType.PUT_COMPONENT)
  })

  it('should emit a CRDT PUT on every playSound call, even with identical parameters (retrigger)', () => {
    const newEngine = Engine()
    const AudioSource = components.AudioSource(newEngine)
    const entity = newEngine.addEntity()

    AudioSource.create(entity, { audioClipUrl: 'a.mp3', playing: false })

    // Flush initial create
    const createMessages = Array.from(AudioSource.getCrdtUpdates())
    expect(createMessages).toHaveLength(1)
    expect(createMessages[0].type).toBe(CrdtMessageType.PUT_COMPONENT)

    // First playSound call
    expect(AudioSource.playSound(entity, 'a.mp3')).toBe(true)
    const firstPlayMessages = Array.from(AudioSource.getCrdtUpdates())
    expect(firstPlayMessages).toHaveLength(1)
    expect(firstPlayMessages[0].type).toBe(CrdtMessageType.PUT_COMPONENT)

    // Second playSound call with identical parameters — must still emit a PUT
    expect(AudioSource.playSound(entity, 'a.mp3')).toBe(true)
    const secondPlayMessages = Array.from(AudioSource.getCrdtUpdates())
    expect(secondPlayMessages).toHaveLength(1)
    expect(secondPlayMessages[0].type).toBe(CrdtMessageType.PUT_COMPONENT)
  })

})
