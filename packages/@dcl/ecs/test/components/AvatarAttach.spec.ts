import { Engine } from '../../src/engine'

describe('Generated BoxShape ProtoBuf', () => {
  it('should serialize/deserialize BoxShape', () => {
    const newEngine = Engine()
    const { AvatarAttach } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const avatarAttach = AvatarAttach.create(entity, {
      avatarId: 'string',
      anchorPointId: 5
    })

    AvatarAttach.create(entityB, {
      avatarId: 'e6',
      anchorPointId: 4
    })

    const buffer = AvatarAttach.toBinary(entity)
    AvatarAttach.updateFromBinary(entityB, buffer)

    expect(avatarAttach).toBeDeepCloseTo({ ...AvatarAttach.mutable(entityB) })

    expect(AvatarAttach.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...AvatarAttach.mutable(entity)
    })
  })
})
