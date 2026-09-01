import * as components from '../../../packages/@dcl/ecs/src/components'
import { Engine, Entity } from '../../../packages/@dcl/ecs/src/engine'
import { createAssetLoadLoadingStateSystem } from '../../../packages/@dcl/ecs/src/systems/assetLoad'
import { LoadingState } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/common/loading_state.gen'

/** What the grow-only value set keeps before it starts dropping the oldest. */
const STORED_VALUES = 100

describe('when more loading states arrive than the component can store', () => {
  let engine: ReturnType<typeof Engine>
  let AssetLoadLoadingState: ReturnType<typeof components.AssetLoadLoadingState>
  let entity: Entity
  let callback: jest.Mock

  beforeEach(async () => {
    engine = Engine()
    AssetLoadLoadingState = components.AssetLoadLoadingState(engine)
    const system = createAssetLoadLoadingStateSystem(engine)

    entity = engine.addEntity()
    callback = jest.fn()
    system.registerAssetLoadLoadingStateEntity(entity, callback)

    for (let index = 1; index <= STORED_VALUES; index++) {
      AssetLoadLoadingState.addValue(entity, {
        asset: `asset-${index}`,
        currentState: LoadingState.LOADING,
        timestamp: index
      })
    }
    await engine.update(1)
  })

  it('should have delivered everything stored so far', () => {
    expect(callback).toHaveBeenCalledTimes(STORED_VALUES)
  })

  it('should keep delivering once the set is full', async () => {
    AssetLoadLoadingState.addValue(entity, {
      asset: 'asset-after-the-cap',
      currentState: LoadingState.FINISHED,
      timestamp: STORED_VALUES + 1
    })
    await engine.update(1)

    expect(callback).toHaveBeenCalledTimes(STORED_VALUES + 1)
  })

  it('should deliver the value that arrived after the cap', async () => {
    AssetLoadLoadingState.addValue(entity, {
      asset: 'asset-after-the-cap',
      currentState: LoadingState.FINISHED,
      timestamp: STORED_VALUES + 1
    })
    await engine.update(1)

    expect(callback).toHaveBeenLastCalledWith(expect.objectContaining({ asset: 'asset-after-the-cap' }))
  })
})

describe('when a tick brings no new loading state', () => {
  let engine: ReturnType<typeof Engine>
  let callback: jest.Mock

  beforeEach(async () => {
    engine = Engine()
    const AssetLoadLoadingState = components.AssetLoadLoadingState(engine)
    const system = createAssetLoadLoadingStateSystem(engine)

    const entity = engine.addEntity()
    callback = jest.fn()
    system.registerAssetLoadLoadingStateEntity(entity, callback)

    AssetLoadLoadingState.addValue(entity, {
      asset: 'asset',
      currentState: LoadingState.LOADING,
      timestamp: 1
    })
    await engine.update(1)
    await engine.update(1)
  })

  it('should not deliver the same value twice', () => {
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
