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

describe('when two loading states share a timestamp but arrive in different ticks', () => {
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

    AssetLoadLoadingState.addValue(entity, { asset: 'a', currentState: LoadingState.LOADING, timestamp: 1 })
    await engine.update(1)

    // The set allows several values at one timestamp, so this is a new event even
    // though its timestamp matches the one already delivered.
    AssetLoadLoadingState.addValue(entity, { asset: 'b', currentState: LoadingState.LOADING, timestamp: 1 })
    await engine.update(1)
  })

  it('should deliver both of them', () => {
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('should not deliver either of them twice', async () => {
    await engine.update(1)

    expect(callback).toHaveBeenCalledTimes(2)
  })
})

describe('when several loading states share a timestamp within one tick', () => {
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

    for (const asset of ['a', 'b', 'c']) {
      AssetLoadLoadingState.addValue(entity, { asset, currentState: LoadingState.LOADING, timestamp: 4 })
    }
    await engine.update(1)
  })

  it('should deliver every one of them', () => {
    expect(callback).toHaveBeenCalledTimes(3)
  })

  it('should not repeat them on the next tick', async () => {
    await engine.update(1)

    expect(callback).toHaveBeenCalledTimes(3)
  })

  it('should still deliver a later event at a higher timestamp', async () => {
    AssetLoadLoadingState.addValue(entity, { asset: 'd', currentState: LoadingState.LOADING, timestamp: 5 })
    await engine.update(1)

    expect(callback).toHaveBeenCalledTimes(4)
  })
})
