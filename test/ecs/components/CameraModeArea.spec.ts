import { Engine, components, CameraType } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated CameraModifierArea ProtoBuf', () => {
  it('should serialize/deserialize CameraModifierArea', () => {
    const newEngine = Engine()
    const CameraModeArea = components.CameraModeArea(newEngine)

    testComponentSerialization(CameraModeArea, {
      area: { x: 1, y: 2, z: 3 },
      mode: CameraType.CT_FIRST_PERSON
    })

    testComponentSerialization(CameraModeArea, {
      area: { x: 3, y: 4, z: 5 },
      mode: CameraType.CT_THIRD_PERSON
    })
  })
})
