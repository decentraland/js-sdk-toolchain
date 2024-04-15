import { MediaState, Engine, components } from '../../../packages/@dcl/ecs/src'
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

  it('should AudioStream.getAudioState helper return current stream state', () => {
    const newEngine = Engine()
    const AudioStream = components.AudioStream(newEngine)
    const AudioEvent = components.AudioEvent(newEngine)
    const entity = newEngine.addEntity()
    const entityWithoutAudioStream = newEngine.addEntity()

    AudioStream.create(entity, {
      url: 'some-src',
      playing: true
    })

    // entity without AudioStream
    expect(AudioStream.getAudioState(entityWithoutAudioStream)).toBe(undefined)

    // entity with AudioStream without AudioEvents
    expect(AudioStream.getAudioState(entity)).toBe(undefined)

    // add some states
    AudioEvent.addValue(entity, { state: MediaState.MS_BUFFERING, timestamp: 1 })
    AudioEvent.addValue(entity, { state: MediaState.MS_ERROR, timestamp: 2 })
    AudioEvent.addValue(entity, { state: MediaState.MS_PLAYING, timestamp: 3 })

    // get last state
    expect(AudioStream.getAudioState(entity)).toStrictEqual({ state: MediaState.MS_PLAYING, timestamp: 3 })
  })
})
