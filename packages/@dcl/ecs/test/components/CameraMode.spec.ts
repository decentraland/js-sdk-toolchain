import { CameraModeValue } from '../../src/components/generated/pb/common/CameraModeValue.gen'
import { Engine } from '../../src/engine'

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
      ...CameraMode.getModifiable(entityB)
    })

    expect(CameraMode.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...CameraMode.getModifiable(entity)
    })
  })
})
