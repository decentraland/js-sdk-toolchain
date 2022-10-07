import { AvatarModifier } from '../../../packages/@dcl/ecs/src/components/generated/pb/ecs/components/AvatarModifierArea.gen'
import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated Avatar ModifierArea ProtoBuf', () => {
  it('should serialize/deserialize Avatar Modifier Area', () => {
    const newEngine = Engine()
    const { AvatarModifierArea } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const avatarModifierArea = AvatarModifierArea.create(entity, {
      area: { x: 1, y: 2, z: 3 },
      modifiers: [
        AvatarModifier.DISABLE_PASSPORTS,
        AvatarModifier.HIDE_AVATARS
      ],
      excludeIds: ['exclude', 'testIdReal', 'numberAndString12837127371']
    })

    AvatarModifierArea.create(entityB, {
      area: { x: 3, y: 4, z: 5 },
      modifiers: [AvatarModifier.UNRECOGNIZED],
      excludeIds: ['exclude_this', 'testId', '12837127371']
    })
    const buffer = AvatarModifierArea.toBinary(entity)
    AvatarModifierArea.updateFromBinary(entityB, buffer)

    expect(avatarModifierArea).toEqual({
      ...AvatarModifierArea.getMutable(entityB)
    })

    expect(AvatarModifierArea.createOrReplace(entityB)).not.toEqual({
      ...AvatarModifierArea.getMutable(entity)
    })
  })
})
