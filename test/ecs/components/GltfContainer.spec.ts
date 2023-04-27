import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated GltfContainer ProtoBuf', () => {
  it('should serialize/deserialize GltfContainer', () => {
    const newEngine = Engine()
    const GltfContainer = components.GltfContainer(newEngine)

    testComponentSerialization(GltfContainer, {
      src: 'test/src',
      visibleMeshesCollisionMask: undefined,
      invisibleMeshesCollisionMask: undefined
    })
  })
})
