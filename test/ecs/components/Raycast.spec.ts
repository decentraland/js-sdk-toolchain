import { Engine, components, RaycastQueryType } from '../../../packages/@dcl/ecs/src'
import { Vector3 } from '../../../packages/@dcl/sdk/math'
import { testComponentSerialization } from './assertion'

describe('Generated Raycast ProtoBuf', () => {
  it('should serialize/deserialize Raycast', () => {
    const newEngine = Engine()
    const Raycast = components.Raycast(newEngine)

    testComponentSerialization(Raycast, {
      collisionMask: undefined,
      originOffset: undefined,
      continuous: false,
      timestamp: 0,
      direction: { $case: 'globalDirection', globalDirection: Vector3.Forward() },
      maxDistance: 100,
      queryType: RaycastQueryType.RQT_HIT_FIRST
    })

    testComponentSerialization(Raycast, {
      collisionMask: undefined,
      originOffset: undefined,
      continuous: false,
      timestamp: 0,
      direction: { $case: 'globalTarget', globalTarget: Vector3.Forward() },
      maxDistance: Infinity,
      queryType: RaycastQueryType.RQT_HIT_FIRST
    })

    testComponentSerialization(Raycast, {
      collisionMask: undefined,
      originOffset: undefined,
      continuous: false,
      timestamp: 0,
      direction: { $case: 'localDirection', localDirection: Vector3.Forward() },
      maxDistance: Infinity,
      queryType: RaycastQueryType.RQT_HIT_FIRST
    })
  })
})
