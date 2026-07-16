import { AvatarMask, Engine, components } from '../../../packages/@dcl/ecs/src'
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
      mask: undefined
    })
    testSchemaSerializationIdentity(AvatarEmoteCommand.schema, {
      emoteUrn: 'boedo',
      loop: false,
      timestamp: 1,
      mask: AvatarMask.AM_UPPER_BODY
    })
  })
})
