import { CameraModeValue } from '../../../packages/@dcl/ecs/src/components/generated/pb/common/CameraModeValue.gen'
import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated CameraMode ProtoBuf', () => {
  it('should serialize/deserialize CameraMode', () => {
    const newEngine = Engine()
    const { CameraMode } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _cameraMode = CameraMode.create(entity, {
      mode: CameraModeValue.THIRD_PERSON
    })

    CameraMode.create(entityB, {
      mode: CameraModeValue.FIRST_PERSON
    })
    const buffer = CameraMode.toBinary(entity)
    CameraMode.updateFromBinary(entityB, buffer)

    expect(_cameraMode).toBeDeepCloseTo({
      ...CameraMode.getMutable(entityB)
    })

    expect(CameraMode.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...CameraMode.getMutable(entity)
    })
  })
})
