import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated PhysicsTotalImpulse ProtoBuf', () => {
  it('should serialize/deserialize PhysicsTotalImpulse', () => {
    const newEngine = Engine()
    const PhysicsTotalImpulse = components.PhysicsTotalImpulse(newEngine)

    testComponentSerialization(PhysicsTotalImpulse, {
      vector: { x: 1.5, y: 10.0, z: -3.2 },
      eventId: 42
    })
  })
})
