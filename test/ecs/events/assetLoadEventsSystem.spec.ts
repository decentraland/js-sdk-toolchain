import {
  components,
  createAssetLoadLoadingStateSystem,
  Engine,
  IEngine,
  AssetLoadLoadingStateSystem,
  LoadingState
} from '../../../packages/@dcl/ecs/src'

describe('AssetLoad loading state helper system should', () => {
  const engine: IEngine = Engine()
  const assetLoadSystem: AssetLoadLoadingStateSystem = createAssetLoadLoadingStateSystem(engine)
  const loadingStateComponent = components.AssetLoadLoadingState(engine)

  it('run callback for every new loading state value', async () => {
    const fn = jest.fn()

    const entity = engine.addEntity()
    assetLoadSystem.registerAssetLoadLoadingStateEntity(entity, fn)

    // no loading state values yet, nothing to report
    await engine.update(1)
    expect(fn).not.toHaveBeenCalled()

    // simulate loading state updates in renderer (can be multiple per tick)
    loadingStateComponent.addValue(entity, {
      asset: 'model.glb',
      currentState: LoadingState.LOADING,
      timestamp: 1
    })
    loadingStateComponent.addValue(entity, {
      asset: 'texture.png',
      currentState: LoadingState.FINISHED,
      timestamp: 1
    })

    await engine.update(1)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ asset: 'model.glb', currentState: LoadingState.LOADING }))
    expect(fn).toHaveBeenCalledWith(
      expect.objectContaining({ asset: 'texture.png', currentState: LoadingState.FINISHED })
    )

    // no new values, no new callbacks
    await engine.update(1)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('preserve already-reported values when re-registering a callback on the same entity', async () => {
    const fn = jest.fn()
    const newFn = jest.fn()

    const entity = engine.addEntity()
    assetLoadSystem.registerAssetLoadLoadingStateEntity(entity, fn)

    // simulate loading state update in renderer
    loadingStateComponent.addValue(entity, {
      asset: 'model.glb',
      currentState: LoadingState.LOADING,
      timestamp: 1
    })

    await engine.update(1)
    expect(fn).toHaveBeenCalledTimes(1)

    // re-register with a new callback; already-reported values must not be replayed
    assetLoadSystem.registerAssetLoadLoadingStateEntity(entity, newFn)

    await engine.update(1)
    expect(newFn).not.toHaveBeenCalled()

    // a new value still fires the new callback, only once
    loadingStateComponent.addValue(entity, {
      asset: 'model.glb',
      currentState: LoadingState.FINISHED,
      timestamp: 2
    })

    await engine.update(1)
    expect(newFn).toHaveBeenCalledTimes(1)
    expect(newFn).toHaveBeenCalledWith(
      expect.objectContaining({ asset: 'model.glb', currentState: LoadingState.FINISHED })
    )
  })

  it('remove subscribed entity correctly', async () => {
    const fn = jest.fn()

    const entity = engine.addEntity()
    assetLoadSystem.registerAssetLoadLoadingStateEntity(entity, fn)
    assetLoadSystem.removeAssetLoadLoadingStateEntity(entity)

    loadingStateComponent.addValue(entity, {
      asset: 'model.glb',
      currentState: LoadingState.LOADING,
      timestamp: 1
    })

    await engine.update(1)
    expect(fn).not.toHaveBeenCalled()
  })

  it('handle deleted entities correctly', async () => {
    const fn = jest.fn()

    const entity = engine.addEntity()
    assetLoadSystem.registerAssetLoadLoadingStateEntity(entity, fn)

    engine.removeEntity(entity)

    await engine.update(1)
    expect(fn).not.toHaveBeenCalled()

    // a new registration after removal still works independently
    const otherEntity = engine.addEntity()
    assetLoadSystem.registerAssetLoadLoadingStateEntity(otherEntity, fn)
    loadingStateComponent.addValue(otherEntity, {
      asset: 'model.glb',
      currentState: LoadingState.LOADING,
      timestamp: 1
    })

    await engine.update(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
