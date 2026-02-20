import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated PhysicsForce ProtoBuf', () => {
  it('should serialize/deserialize PhysicsForce', () => {
    const newEngine = Engine()
    const PhysicsForce = components.PhysicsForce(newEngine)

    testComponentSerialization(PhysicsForce, {
      direction: { x: 5.0, y: -2.5, z: 8.3 }
    })
  })
})
