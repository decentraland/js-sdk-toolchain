import { components, Engine } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization, testSchemaSerializationIdentity } from './assertion'

describe('Generated AssetLoad ProtoBuf', () => {
  it('should serialize via component create/replace', () => {
    const newEngine = Engine()
    const AssetLoad = components.AssetLoad(newEngine)

    testComponentSerialization(AssetLoad, {
      assets: ['asset1', 'asset2']
    })

    testComponentSerialization(AssetLoad, {
      assets: ['asset1', 'asset2', 'asset3']
    })
  })

  it('should serialize', () => {
    const newEngine = Engine()
    const AssetLoad = components.AssetLoad(newEngine)

    testSchemaSerializationIdentity(AssetLoad.schema, {
      assets: ['asset1', 'asset2']
    })

    testSchemaSerializationIdentity(AssetLoad.schema, {
      assets: ['asset1', 'asset2', 'asset3']
    })

    testSchemaSerializationIdentity(AssetLoad.schema, AssetLoad.schema.create())
  })
})
