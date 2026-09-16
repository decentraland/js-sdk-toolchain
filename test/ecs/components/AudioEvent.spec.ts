import { components, Engine, MediaState } from '../../../packages/@dcl/ecs/src'
import { testSchemaSerializationIdentity } from './assertion'

describe('Generated AudioEvent ProtoBuf', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const AudioEvent = components.AudioEvent(newEngine)

    // State-only report, as renderers without position support write it
    testSchemaSerializationIdentity(AudioEvent.schema, {
      timestamp: 5,
      state: MediaState.MS_LOADING,
      tickNumber: undefined,
      currentOffset: undefined,
      clipLength: undefined
    })

    // Playback-position report written while a clip plays
    testSchemaSerializationIdentity(AudioEvent.schema, {
      timestamp: 10,
      state: MediaState.MS_PLAYING,
      tickNumber: 10,
      currentOffset: 1.25,
      clipLength: 64
    })

    // Position without a known length, as for streams
    testSchemaSerializationIdentity(AudioEvent.schema, {
      timestamp: 30,
      state: MediaState.MS_PLAYING,
      tickNumber: 30,
      currentOffset: 12.5,
      clipLength: undefined
    })

    testSchemaSerializationIdentity(AudioEvent.schema, AudioEvent.schema.create())
  })
})
