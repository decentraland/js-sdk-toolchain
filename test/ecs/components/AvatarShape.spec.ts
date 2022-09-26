import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated AvatarShape ProtoBuf', () => {
  it('should serialize/deserialize AvatarShape', () => {
    const newEngine = Engine()
    const { AvatarShape } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const avatarShape = AvatarShape.create(entity, {
      id: 'test',
      name: ' name',
      bodyShape: 'bodyshape',
      skinColor: { r: 0, g: 0, b: 0 },
      hairColor: { r: 0, g: 0, b: 0 },
      eyeColor: { r: 0, g: 0, b: 0 },
      wearables: ['wearable1', 'wearable2'],
      expressionTriggerId: 'id',
      expressionTriggerTimestamp: 0,
      talking: true,
      emotes: []
    })

    AvatarShape.create(entityB, {
      id: 'test2',
      name: ' name2',
      bodyShape: 'bodyshape2',
      skinColor: { r: 1, g: 1, b: 1 },
      hairColor: { r: 1, g: 1, b: 1 },
      eyeColor: { r: 1, g: 1, b: 1 },
      wearables: ['wearable12', 'wearable22'],
      expressionTriggerId: 'id2',
      expressionTriggerTimestamp: 1,
      talking: false,
      emotes: []
    })
    const buffer = AvatarShape.toBinary(entity)
    AvatarShape.updateFromBinary(entityB, buffer)

    expect(avatarShape).toEqual({ ...AvatarShape.get(entityB) })
    expect(AvatarShape.createOrReplace(entityB)).not.toEqual({
      ...AvatarShape.get(entity)
    })
  })
})
