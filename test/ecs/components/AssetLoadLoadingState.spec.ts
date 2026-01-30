import { components, Engine, LoadingState } from '../../../packages/@dcl/ecs/src'
import { testSchemaSerializationIdentity } from './assertion'

describe('Generated AssetLoadLoadingState ProtoBuf', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const AssetLoadLoadingState = components.AssetLoadLoadingState(newEngine)

    testSchemaSerializationIdentity(AssetLoadLoadingState.schema, {
      timestamp: 5,
      asset: "asset1",
      currentState: LoadingState.LOADING
    })

    testSchemaSerializationIdentity(AssetLoadLoadingState.schema, {
      timestamp: 10,
      asset: "asset1",
      currentState: LoadingState.FINISHED_WITH_ERROR
    })

    testSchemaSerializationIdentity(AssetLoadLoadingState.schema, {
      timestamp: 30,
      asset: "asset1",
      currentState: LoadingState.NOT_FOUND
    })

    testSchemaSerializationIdentity(AssetLoadLoadingState.schema, {
      timestamp: 30,
      asset: "asset1",
      currentState: LoadingState.UNKNOWN
    })

    testSchemaSerializationIdentity(AssetLoadLoadingState.schema, {
      timestamp: 30,
      asset: "asset1",
      currentState: LoadingState.FINISHED
    })

    testSchemaSerializationIdentity(AssetLoadLoadingState.schema, AssetLoadLoadingState.schema.create())
  })
})
