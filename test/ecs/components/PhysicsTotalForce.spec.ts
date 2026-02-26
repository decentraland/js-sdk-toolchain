import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated PhysicsTotalForce ProtoBuf', () => {
  it('should serialize/deserialize PhysicsTotalForce', () => {
    const newEngine = Engine()
    const PhysicsTotalForce = components.PhysicsTotalForce(newEngine)

    testComponentSerialization(PhysicsTotalForce, {
      vector: { x: 5.0, y: -2.5, z: 8.3 }
    })
  })
})
