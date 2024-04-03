import { components, Engine, AudioState } from '../../../packages/@dcl/ecs/src'
import { testSchemaSerializationIdentity } from './assertion'

describe('Generated AudioEvent ProtoBuf', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const AudioEvent = components.AudioEvent(newEngine)

    testSchemaSerializationIdentity(AudioEvent.schema, {
      timestamp: 5,
      state: AudioState.AS_LOADING
    })

    testSchemaSerializationIdentity(AudioEvent.schema, {
      timestamp: 10,
      state: AudioState.AS_PLAYING
    })

    testSchemaSerializationIdentity(AudioEvent.schema, {
      timestamp: 30,
      state: AudioState.AS_PLAYING
    })

    testSchemaSerializationIdentity(AudioEvent.schema, AudioEvent.schema.create())
  })
})
