import {
  Engine,
  components,
  AvatarModifierType
} from '../../../packages/@dcl/ecs/src'

describe('Generated Avatar ModifierArea ProtoBuf', () => {
  it('should serialize/deserialize Avatar Modifier Area', () => {
    const newEngine = Engine()
    const AvatarModifierArea = components.AvatarModifierArea(newEngine)
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const avatarModifierArea = AvatarModifierArea.create(entity, {
      area: { x: 1, y: 2, z: 3 },
      modifiers: [
        AvatarModifierType.AMT_DISABLE_PASSPORTS,
        AvatarModifierType.AMT_HIDE_AVATARS
      ],
      excludeIds: ['exclude', 'testIdReal', 'numberAndString12837127371']
    })

    AvatarModifierArea.create(entityB, {
      area: { x: 3, y: 4, z: 5 },
      modifiers: [],
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
