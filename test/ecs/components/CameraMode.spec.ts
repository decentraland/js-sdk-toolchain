import { Engine, components, CameraType } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated CameraMode ProtoBuf', () => {
  it('should serialize/deserialize CameraMode', () => {
    const newEngine = Engine()
    const CameraMode = components.CameraMode(newEngine)

    testComponentSerialization(CameraMode, {
      mode: CameraType.CT_THIRD_PERSON
    })
    testComponentSerialization(CameraMode, {
      mode: CameraType.CT_FIRST_PERSON
    })
  })
})
