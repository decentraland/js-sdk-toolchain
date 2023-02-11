import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated AvatarAttach ProtoBuf', () => {
  it('should serialize/deserialize AvatarAttach', () => {
    const newEngine = Engine()
    const AvatarAttach = components.AvatarAttach(newEngine)

    testComponentSerialization(AvatarAttach, {
      avatarId: 'string',
      anchorPointId: 5
    })

    testComponentSerialization(AvatarAttach, {
      avatarId: 'e6',
      anchorPointId: 4
    })
  })
})
