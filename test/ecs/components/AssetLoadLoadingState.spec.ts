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

describe('AssetLoadLoadingState GrowOnlyValueSet', () => {
  const newEngine = Engine()
  const AssetLoadLoadingState = components.AssetLoadLoadingState(newEngine)
  const entity = newEngine.addEntity()

  it('should append values to the set', () => {
    const result = AssetLoadLoadingState.addValue(entity, {
      asset: 'asset1',
      currentState: LoadingState.LOADING,
      timestamp: 1
    })
    expect(result.size).toBe(1)
  })

  it('should throw when trying to mutate the set or its values', () => {
    const set = AssetLoadLoadingState.get(entity)
    const [value] = set

    expect(() => (set as any).add({})).toThrow('The set is frozen')
    expect(() => (set as any).clear()).toThrow('The set is frozen')
    expect(() => ((value as any).asset = 'asset2')).toThrow('Cannot assign to read only property')
  })
})