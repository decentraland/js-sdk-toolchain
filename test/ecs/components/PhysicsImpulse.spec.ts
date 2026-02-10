import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated PhysicsImpulse ProtoBuf', () => {
  it('should serialize/deserialize PhysicsImpulse', () => {
    const newEngine = Engine()
    const PhysicsImpulse = components.PhysicsImpulse(newEngine)

    testComponentSerialization(PhysicsImpulse, {
      direction: { x: 1.5, y: 10.0, z: -3.2 },
      timestamp: 42
    })
  })
})
