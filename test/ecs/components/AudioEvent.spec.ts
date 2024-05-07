import { components, Engine, MediaState } from '../../../packages/@dcl/ecs/src'
import { testSchemaSerializationIdentity } from './assertion'

describe('Generated AudioEvent ProtoBuf', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const AudioEvent = components.AudioEvent(newEngine)

    testSchemaSerializationIdentity(AudioEvent.schema, {
      timestamp: 5,
      state: MediaState.MS_LOADING
    })

    testSchemaSerializationIdentity(AudioEvent.schema, {
      timestamp: 10,
      state: MediaState.MS_PLAYING
    })

    testSchemaSerializationIdentity(AudioEvent.schema, {
      timestamp: 30,
      state: MediaState.MS_PLAYING
    })

    testSchemaSerializationIdentity(AudioEvent.schema, AudioEvent.schema.create())
  })
})
