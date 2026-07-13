import { AvatarMask, Engine, components } from '../../../packages/@dcl/ecs/src'
import { testSchemaSerializationIdentity } from './assertion'

describe('Generated PointerEventsResult ProtoBuf', () => {
  it('should serialize/deserialize PointerEventsResult', () => {
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
