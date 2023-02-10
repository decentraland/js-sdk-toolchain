import { Engine, components, AvatarModifierType } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated Avatar ModifierArea ProtoBuf', () => {
  it('should serialize/deserialize Avatar Modifier Area', () => {
    const newEngine = Engine()
    const AvatarModifierArea = components.AvatarModifierArea(newEngine)

    testComponentSerialization(AvatarModifierArea, {
      area: { x: 1, y: 2, z: 3 },
      modifiers: [AvatarModifierType.AMT_DISABLE_PASSPORTS, AvatarModifierType.AMT_HIDE_AVATARS],
      excludeIds: ['exclude', 'testIdReal', 'numberAndString12837127371']
    })

    testComponentSerialization(AvatarModifierArea, {
      area: { x: 3, y: 4, z: 5 },
      modifiers: [],
      excludeIds: ['exclude_this', 'testId', '12837127371']
    })
  })
})
