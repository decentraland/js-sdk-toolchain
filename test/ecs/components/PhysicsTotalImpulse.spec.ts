import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated PhysicsCombinedImpulse ProtoBuf', () => {
  it('should serialize/deserialize PhysicsCombinedImpulse', () => {
    const newEngine = Engine()
    const PhysicsCombinedImpulse = components.PhysicsCombinedImpulse(newEngine)

    testComponentSerialization(PhysicsCombinedImpulse, {
      vector: { x: 1.5, y: 10.0, z: -3.2 },
      eventId: 42
    })
  })
})
