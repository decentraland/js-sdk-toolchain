import {Engine} from '../../src/engine'
import {CameraModeValue} from "../../src/components/generated/pb/common/CameraModeValue.gen";

describe('Generated CameraModifierArea ProtoBuf', () => {
  it('should serialize/deserialize CameraModifierArea', () => {
    const newEngine = Engine()
    const { CameraModeArea } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const avatarModifierArea = CameraModeArea.create(entity, {
      area: { x: 1, y: 2, z: 3 },
      mode: CameraModeValue.FIRST_PERSON
    })

    CameraModeArea.create(entityB, {
      area: { x: 3, y: 4, z: 5 },
      mode: CameraModeValue.THIRD_PERSON
    })
    const buffer = CameraModeArea.toBinary(entity)
    CameraModeArea.updateFromBinary(entityB, buffer)

    expect(avatarModifierArea).toEqual({
      ...CameraModeArea.mutable(entityB)
    })

    expect(CameraModeArea.createOrReplace(entityB)).not.toEqual({
      ...CameraModeArea.mutable(entity)
    })
  })
})
