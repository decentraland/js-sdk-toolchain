import { engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated PrimaryPointerInfo ProtoBuf', () => {
  it('should serialize/deserialize PrimaryPointerInfo', () => {
    const primaryPointerInfo = components.PrimaryPointerInfo(engine)

    testComponentSerialization(primaryPointerInfo, {
      pointerType: 1, // POT_MOUSE
      screenCoordinates: { x: 100, y: 200 },
      screenDelta: { x: 10, y: 20 },
      worldRayDirection: { x: 0, y: 1, z: 0 }
    })

    testComponentSerialization(primaryPointerInfo, {
      pointerType: 0, // POT_NONE
      screenCoordinates: { x: 0, y: 0 },
      screenDelta: { x: 0, y: 0 },
      worldRayDirection: { x: 0, y: 0, z: 0 }
    })
  })
})