import { Engine, components, RaycastQueryType } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated Raycast ProtoBuf', () => {
  it('should serialize/deserialize Raycast', () => {
    const newEngine = Engine()
    const Raycast = components.Raycast(newEngine)

    testComponentSerialization(Raycast, {
      origin: undefined,
      direction: undefined,
      maxDistance: 100,
      queryType: RaycastQueryType.RQT_HIT_FIRST
    })

    testComponentSerialization(Raycast, {
      origin: undefined,
      direction: undefined,
      maxDistance: Infinity,
      queryType: RaycastQueryType.RQT_HIT_FIRST
    })
  })
})
