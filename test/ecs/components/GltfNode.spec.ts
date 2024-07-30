import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated GltfNode ProtoBuf', () => {
  it('should serialize/deserialize GltfNode', () => {
    const newEngine = Engine()
    const GltfNode = components.GltfNode(newEngine)

    testComponentSerialization(GltfNode, {
      path: 'someGltfNode'
    })
  })
})
