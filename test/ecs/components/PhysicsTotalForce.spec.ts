import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated PhysicsCombinedForce ProtoBuf', () => {
  it('should serialize/deserialize PhysicsCombinedForce', () => {
    const newEngine = Engine()
    const PhysicsCombinedForce = components.PhysicsCombinedForce(newEngine)

    testComponentSerialization(PhysicsCombinedForce, {
      vector: { x: 5.0, y: -2.5, z: 8.3 }
    })
  })
})
