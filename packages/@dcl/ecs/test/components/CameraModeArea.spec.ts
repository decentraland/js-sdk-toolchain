import {Engine} from '../../src/engine'
import {PBAvatarModifierArea_Modifier} from '../../src/components/generated/pb/AvatarModifierArea.gen'
import {PBCameraModeArea_CameraMode} from "../../src/components/generated/pb/CameraModeArea.gen";

describe('Generated CameraModifierArea ProtoBuf', () => {
  it('should serialize/deserialize CameraModifierArea', () => {
    const newEngine = Engine()
    const { CameraModeArea } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const avatarModifierArea = CameraModeArea.create(entity, {
      area: { x: 1, y: 2, z: 3 },
      mode: PBCameraModeArea_CameraMode.FIRST_PERSON
    })

    CameraModeArea.create(entityB, {
      area: { x: 3, y: 4, z: 5 },
      mode: PBCameraModeArea_CameraMode.THIRD_PERSON
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
