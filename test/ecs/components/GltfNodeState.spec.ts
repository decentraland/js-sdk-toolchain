import { Engine, GltfNodeStateValue, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated GltfNodeState ProtoBuf', () => {
  it('should serialize/deserialize GltfNodeState', () => {
    const newEngine = Engine()
    const GltfNodeState = components.GltfNodeState(newEngine)

    testComponentSerialization(GltfNodeState, {
      state: GltfNodeStateValue.GNSV_PENDING,
      error: undefined
    })
  })
})
