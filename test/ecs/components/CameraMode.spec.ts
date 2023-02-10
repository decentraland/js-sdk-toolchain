import { Engine, components, CameraType } from '../../../packages/@dcl/ecs/src'

describe('Generated CameraMode ProtoBuf', () => {
  it('should serialize/deserialize CameraMode', () => {
    const newEngine = Engine()
    const CameraMode = components.CameraMode(newEngine)
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _cameraMode = CameraMode.create(entity, {
      mode: CameraType.CT_THIRD_PERSON
    })

    CameraMode.create(entityB, {
      mode: CameraType.CT_FIRST_PERSON
    })
    const buffer = CameraMode.toBinary(entity)
    CameraMode.upsertFromBinary(entityB, buffer)

    const immutableCameraMode = CameraMode.get(entity)
    switch (immutableCameraMode.mode) {
      case CameraType.CT_FIRST_PERSON:
        break
    }

    expect(_cameraMode).toBeDeepCloseTo({
      ...CameraMode.getMutable(entityB)
    })

    expect(CameraMode.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...CameraMode.getMutable(entity)
    })
  })
})
