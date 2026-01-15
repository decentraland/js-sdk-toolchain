import {
  EasingFunction,
  Engine,
  Entity,
  IEngine,
  PBTween,
  TweenComponentDefinitionExtended,
  TweenLoop,
  TweenStateStatus,
  components
} from '../../../packages/@dcl/ecs/src'
import { createTweenSystem } from '../../../packages/@dcl/ecs/src/systems/tween'
import { Quaternion, Vector2, Vector3 } from '../../../packages/@dcl/sdk/math'

function mockTweenEngine(engine: IEngine, Tween: TweenComponentDefinitionExtended) {
  return async function (entity: Entity, mode?: PBTween['mode']) {
    const tween = Tween.createOrReplace(entity, {
      duration: 1000,
      easingFunction: EasingFunction.EF_EASEBACK,
      mode: mode || Tween.Mode.Move({ start: Vector3.create(), end: Vector3.create() })
    })
    return tween
  }
}

function mockTweenStatusEngine(engine: IEngine, TweenState: ReturnType<typeof components.TweenState>) {
  return async function (entity: Entity) {
    TweenState.deleteFrom(entity)
    // Run a few updates to ensure cache is initialized
    await engine.update(1)
    await engine.update(1)
    await engine.update(1)
    await engine.update(1)
    TweenState.createOrReplace(entity, { state: TweenStateStatus.TS_COMPLETED, currentTime: 1 })
    await engine.update(1)
  }
}
describe('Tween System', () => {
  const engine = Engine()
  const tweenSystem = createTweenSystem(engine)
  const Tween = components.Tween(engine)
  const TweenState = components.TweenState(engine)
  const TweenSequence = components.TweenSequence(engine)
  const entity = engine.addEntity()
  const completed = jest.fn()
  const mockTween = mockTweenEngine(engine, Tween)
  const mockTweenStatus = mockTweenStatusEngine(engine, TweenState)
  beforeEach(() => {
    jest.resetAllMocks()
  })
  it('should create a tween and check if the completed or changed is called', async () => {
    await mockTween(entity)

    engine.addSystem(() => {
      if (tweenSystem.tweenCompleted(entity)) {
        completed()
      }
    })
    expect(completed).toBeCalledTimes(0)
  })
  it('should create a tweenState and call isCompleted', async () => {
    await mockTweenStatus(entity)
    expect(completed).toBeCalledTimes(1)
  })
  it('should not called again isCompleted', async () => {
    await engine.update(1)
    expect(completed).toBeCalledTimes(0)
  })

  it('should reset fn and called isChanged if the tween has changed', async () => {
    TweenState.deleteFrom(entity)
    await mockTween(entity, Tween.Mode.Move({ start: Vector3.Forward(), end: Vector3.Down() }))
    await engine.update(1)
    expect(completed).toBeCalledTimes(0)
  })

  it('should create a YOYO tweenSequence for the entity', async () => {
    TweenSequence.create(entity, { sequence: [], loop: TweenLoop.TL_YOYO })
    await engine.update(1)
  })

  it('should change to backwards the Tween when its completed', async () => {
    expect(Tween.get(entity).mode).toMatchCloseTo(Tween.Mode.Move({ start: Vector3.Forward(), end: Vector3.Down() }))
    await mockTweenStatus(entity)
    await engine.update(1)
    expect(completed).toBeCalledTimes(1)
    expect(Tween.get(entity).mode).toMatchCloseTo(Tween.Mode.Move({ start: Vector3.Down(), end: Vector3.Forward() }))
  })

  it('should change to backwards the Rotate Tween when its completed', async () => {
    await mockTween(entity, Tween.Mode.Rotate({ start: Quaternion.Zero(), end: Quaternion.Identity() }))
    await mockTweenStatus(entity)
    expect(completed).toBeCalledTimes(1)
    expect(Tween.get(entity).mode).toMatchCloseTo(
      Tween.Mode.Rotate({ end: Quaternion.Zero(), start: Quaternion.Identity() })
    )
  })

  it('should change to backwards the Scale Tween when its completed', async () => {
    await mockTween(entity, Tween.Mode.Scale({ start: Vector3.Left(), end: Vector3.Right() }))
    await mockTweenStatus(entity)
    expect(completed).toBeCalledTimes(1)
    expect(Tween.get(entity).mode).toMatchCloseTo(Tween.Mode.Scale({ end: Vector3.Left(), start: Vector3.Right() }))
  })

  it('should change to backwards the TextureMove Tween when its completed', async () => {
    await mockTween(entity, Tween.Mode.TextureMove({ start: Vector2.Zero(), end: Vector2.One() }))
    await mockTweenStatus(entity)
    expect(completed).toBeCalledTimes(1)
    expect(Tween.get(entity).mode).toMatchCloseTo(Tween.Mode.TextureMove({ end: Vector2.Zero(), start: Vector2.One() }))
  })

  it('should create a RESTART tweenSequence for the entity and restart the tween once its completed', async () => {
    TweenState.deleteFrom(entity)
    const tween = await mockTween(entity, Tween.Mode.Move({ start: Vector3.Forward(), end: Vector3.Down() }))
    TweenSequence.createOrReplace(entity, { sequence: [], loop: TweenLoop.TL_RESTART })
    await mockTweenStatus(entity)
    // One frame to delete the Tween so the renderer can restart it
    expect(Tween.getOrNull(entity)).toBe(null)
    expect(completed).toBeCalledTimes(1)
    await engine.update(1)
    expect(Tween.getOrNull(entity)).toMatchCloseTo(tween)
  })

  it('should create a sequence and when its finish restart it', async () => {
    TweenState.deleteFrom(entity)
    const tween = await mockTween(entity, Tween.Mode.Move({ start: Vector3.Forward(), end: Vector3.Down() }))
    const rotateTween = { ...tween, mode: Tween.Mode.Rotate({ start: Quaternion.Zero(), end: Quaternion.Identity() }) }
    const scaleTween = { ...tween, mode: Tween.Mode.Scale({ start: Vector3.Left(), end: Vector3.Right() }) }
    TweenSequence.createOrReplace(entity, {
      sequence: [rotateTween, scaleTween],
      loop: TweenLoop.TL_RESTART
    })
    await mockTweenStatus(entity)
    expect(Tween.getOrNull(entity)).toMatchObject(rotateTween)
    expect(completed).toBeCalledTimes(1)
    expect(TweenSequence.get(entity).sequence).toMatchObject([scaleTween, tween])
    TweenState.deleteFrom(entity)
    await mockTweenStatus(entity)
    expect(Tween.getOrNull(entity)).toMatchObject(scaleTween)
    expect(completed).toBeCalledTimes(2)
    expect(TweenSequence.get(entity).sequence).toMatchObject([tween, rotateTween])
  })

  it('should call the createTweenSystem twice with the same engine and check if the tween system was created just once', async () => {
    const tweenSystemAlt = createTweenSystem(engine)
    expect(tweenSystem).toBe(tweenSystemAlt)
    await mockTween(entity)

    engine.addSystem(() => {
      if (tweenSystem.tweenCompleted(entity)) {
        completed()
      }
    })
    expect(completed).toBeCalledTimes(0)
  })

  it('should call the createTweenSystem twice with different engines and check if both tween systems were created', async () => {
    // Wait to ensure different engine IDs (engine._id uses Date.now())
    await new Promise((resolve) => setTimeout(resolve, 2))
    const engineAlt = Engine()
    const tweenSystemAlt = createTweenSystem(engineAlt)
    expect(tweenSystem).not.toBe(tweenSystemAlt)
    await mockTween(entity)

    engine.addSystem(() => {
      if (tweenSystem.tweenCompleted(entity)) {
        completed()
      }
    })
    expect(completed).toBeCalledTimes(0)
  })

  describe('ENABLE_SDK_TWEEN_SEQUENCE flag behavior', () => {
    afterEach(() => {
      // Clean up global flag after each test
      delete (globalThis as any).ENABLE_SDK_TWEEN_SEQUENCE
    })

    it('should NOT execute YOYO tween sequence logic when flag is false', async () => {
      // Set flag to false BEFORE creating engine
      ;(globalThis as any).ENABLE_SDK_TWEEN_SEQUENCE = false
      // Wait to ensure unique engine ID
      await new Promise((resolve) => setTimeout(resolve, 2))
      const testEngine = Engine()
      const _testTweenSystem = createTweenSystem(testEngine)
      const testTween = components.Tween(testEngine)
      const testTweenState = components.TweenState(testEngine)
      const testTweenSequence = components.TweenSequence(testEngine)
      const testEntity = testEngine.addEntity()

      // Create a tween with YOYO sequence
      const originalTween = testTween.createOrReplace(testEntity, {
        duration: 1000,
        easingFunction: EasingFunction.EF_EASEBACK,
        mode: testTween.Mode.Move({ start: Vector3.create(0, 0, 0), end: Vector3.create(1, 1, 1) })
      })
      testTweenSequence.createOrReplace(testEntity, { sequence: [], loop: TweenLoop.TL_YOYO })

      // Complete the tween
      testTweenState.deleteFrom(testEntity)
      await testEngine.update(1)
      await testEngine.update(1)
      await testEngine.update(1)
      await testEngine.update(1)
      testTweenState.createOrReplace(testEntity, { state: TweenStateStatus.TS_COMPLETED, currentTime: 1 })
      await testEngine.update(1)

      // When flag is false, YOYO should NOT reverse the tween
      const currentTween = testTween.get(testEntity)
      expect(currentTween.mode).toMatchCloseTo(originalTween.mode)
    })

    it('should execute YOYO tween sequence logic when flag is true', async () => {
      // Set flag to true BEFORE creating engine
      ;(globalThis as any).ENABLE_SDK_TWEEN_SEQUENCE = true
      // Wait to ensure unique engine ID
      await new Promise((resolve) => setTimeout(resolve, 2))
      const testEngine = Engine()
      const _testTweenSystem = createTweenSystem(testEngine)
      const testTween = components.Tween(testEngine)
      const testTweenState = components.TweenState(testEngine)
      const testTweenSequence = components.TweenSequence(testEngine)
      const testEntity = testEngine.addEntity()

      // Create a tween with YOYO sequence
      testTween.createOrReplace(testEntity, {
        duration: 1000,
        easingFunction: EasingFunction.EF_EASEBACK,
        mode: testTween.Mode.Move({ start: Vector3.create(0, 0, 0), end: Vector3.create(1, 1, 1) })
      })
      testTweenSequence.createOrReplace(testEntity, { sequence: [], loop: TweenLoop.TL_YOYO })

      // Complete the tween
      testTweenState.deleteFrom(testEntity)
      await testEngine.update(1)
      await testEngine.update(1)
      await testEngine.update(1)
      await testEngine.update(1)
      testTweenState.createOrReplace(testEntity, { state: TweenStateStatus.TS_COMPLETED, currentTime: 1 })
      await testEngine.update(1)

      // When flag is true, YOYO should reverse the tween
      const currentTween = testTween.get(testEntity)
      expect(currentTween.mode).toMatchCloseTo(
        testTween.Mode.Move({ start: Vector3.create(1, 1, 1), end: Vector3.create(0, 0, 0) })
      )
    })

    it('should execute YOYO tween sequence logic when flag is undefined (default behavior)', async () => {
      // Ensure flag is undefined (default behavior) - delete it before creating engine
      delete (globalThis as any).ENABLE_SDK_TWEEN_SEQUENCE
      // Verify it's actually undefined
      expect((globalThis as any).ENABLE_SDK_TWEEN_SEQUENCE).toBeUndefined()
      // Wait to ensure unique engine ID
      await new Promise((resolve) => setTimeout(resolve, 2))
      const testEngine = Engine()
      const _testTweenSystem = createTweenSystem(testEngine)
      const testTween = components.Tween(testEngine)
      const testTweenState = components.TweenState(testEngine)
      const testTweenSequence = components.TweenSequence(testEngine)
      const testEntity = testEngine.addEntity()

      // Create a tween with YOYO sequence
      testTween.createOrReplace(testEntity, {
        duration: 1000,
        easingFunction: EasingFunction.EF_EASEBACK,
        mode: testTween.Mode.Move({ start: Vector3.create(0, 0, 0), end: Vector3.create(1, 1, 1) })
      })
      testTweenSequence.createOrReplace(testEntity, { sequence: [], loop: TweenLoop.TL_YOYO })

      // Complete the tween
      testTweenState.deleteFrom(testEntity)
      await testEngine.update(1)
      await testEngine.update(1)
      await testEngine.update(1)
      await testEngine.update(1)
      testTweenState.createOrReplace(testEntity, { state: TweenStateStatus.TS_COMPLETED, currentTime: 1 })
      await testEngine.update(1)

      // When flag is undefined, YOYO should work (tween sequences enabled by default)
      const currentTween = testTween.get(testEntity)
      expect(currentTween.mode).toMatchCloseTo(
        testTween.Mode.Move({ start: Vector3.create(1, 1, 1), end: Vector3.create(0, 0, 0) })
      )
    })
  })
})
