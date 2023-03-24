import { Engine, components, AvatarAnchorPointType } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated AvatarAttach ProtoBuf', () => {
  it('should serialize/deserialize AvatarAttach', () => {
    const newEngine = Engine()
    const AvatarAttach = components.AvatarAttach(newEngine)

    testComponentSerialization(AvatarAttach, {
      avatarId: 'string',
      anchorPointId: AvatarAnchorPointType.AAPT_POSITION
    })

    testComponentSerialization(AvatarAttach, {
      avatarId: 'e6',
      anchorPointId: AvatarAnchorPointType.AAPT_RIGHT_HAND
    })
  })
})
