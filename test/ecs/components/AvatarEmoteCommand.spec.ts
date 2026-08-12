import { AvatarMask, EmoteState, Engine, components } from '../../../packages/@dcl/ecs/src'
import { testSchemaSerializationIdentity } from './assertion'

describe('Generated AvatarEmoteCommand ProtoBuf', () => {
  it('should serialize/deserialize AvatarEmoteCommand', () => {
    const newEngine = Engine()
    const AvatarEmoteCommand = components.AvatarEmoteCommand(newEngine)
    // AvatarEmoteCommand.addValue()
    testSchemaSerializationIdentity(AvatarEmoteCommand.schema, {
      emoteUrn: 'boedo',
      loop: false,
      timestamp: 1,
      mask: undefined,
      state: undefined
    })
    testSchemaSerializationIdentity(AvatarEmoteCommand.schema, {
      emoteUrn: 'boedo',
      loop: false,
      timestamp: 1,
      mask: AvatarMask.AM_UPPER_BODY,
      state: undefined
    })
    testSchemaSerializationIdentity(AvatarEmoteCommand.schema, {
      emoteUrn: 'boedo',
      loop: false,
      timestamp: 1,
      mask: AvatarMask.AM_UPPER_BODY,
      state: EmoteState.ES_STARTED
    })
    testSchemaSerializationIdentity(AvatarEmoteCommand.schema, {
      emoteUrn: 'boedo',
      loop: false,
      timestamp: 1,
      mask: undefined,
      state: EmoteState.ES_FINISHED
    })
    testSchemaSerializationIdentity(AvatarEmoteCommand.schema, {
      emoteUrn: 'boedo',
      loop: false,
      timestamp: 1,
      mask: undefined,
      state: EmoteState.ES_INTERRUPTED
    })
  })
})
