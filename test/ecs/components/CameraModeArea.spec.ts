import { Engine, components, CameraType } from '../../../packages/@dcl/ecs/src'

describe('Generated CameraModifierArea ProtoBuf', () => {
  it('should serialize/deserialize CameraModifierArea', () => {
    const newEngine = Engine()
    const CameraModeArea = components.CameraModeArea(newEngine)
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const avatarModifierArea = CameraModeArea.create(entity, {
      area: { x: 1, y: 2, z: 3 },
      mode: CameraType.CT_FIRST_PERSON
    })

    CameraModeArea.create(entityB, {
      area: { x: 3, y: 4, z: 5 },
      mode: CameraType.CT_THIRD_PERSON
    })
    const buffer = CameraModeArea.toBinary(entity)
    CameraModeArea.updateFromBinary(entityB, buffer)

    expect(avatarModifierArea).toEqual({
      ...CameraModeArea.getMutable(entityB)
    })

    expect(CameraModeArea.createOrReplace(entityB)).not.toEqual({
      ...CameraModeArea.getMutable(entity)
    })
  })
})
