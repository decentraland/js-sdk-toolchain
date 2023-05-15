import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated NftShape ProtoBuf', () => {
  it('should serialize/deserialize NftShape', () => {
    const newEngine = Engine()
    const NftShape = components.NftShape(newEngine)

    testComponentSerialization(NftShape, {
      color: { r: 1, g: 1, b: 1 },
      urn: 'testSrc',
      style: 5
    })

    testComponentSerialization(NftShape, {
      color: { r: 0, g: 0, b: 0 },
      urn: 'NotestSrc',
      style: 2
    })
  })
})
