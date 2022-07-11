﻿import { Engine } from '../../src/engine'
import { PBAvatarModifierArea_Modifier } from '../../src/components/generated/pb/AvatarModifierArea.gen'

describe('Generated Avatar ModifierArea ProtoBuf', () => {
  it('should serialize/deserialize Avatar Modifier Area', () => {
    const newEngine = Engine()
    const { AvatarModifierArea } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const avatarModifierArea = AvatarModifierArea.create(entity, {
      area: { x: 1, y: 2, z: 3 },
      modifiers: [
        PBAvatarModifierArea_Modifier.DISABLE_PASSPORTS,
        PBAvatarModifierArea_Modifier.HIDE_AVATARS
      ],
      excludeIds: ['exclude', 'testIdReal', 'numberAndString12837127371']
    })

    AvatarModifierArea.create(entityB, {
      area: { x: 3, y: 4, z: 5 },
      modifiers: [PBAvatarModifierArea_Modifier.UNRECOGNIZED],
      excludeIds: ['exclude_this', 'testId', '12837127371']
    })
    const buffer = AvatarModifierArea.toBinary(entity)
    AvatarModifierArea.updateFromBinary(entityB, buffer)

    expect(avatarModifierArea).toEqual({
      ...AvatarModifierArea.mutable(entityB)
    })

    expect(AvatarModifierArea.createOrReplace(entityB)).not.toEqual({
      ...AvatarModifierArea.mutable(entity)
    })
  })
})
