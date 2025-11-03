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

// Mock ~system/Runtime to control platform detection
jest.mock('~system/Runtime')

// Helper to set platform and wait for platform check to complete
async function waitForPlatformCheck(engine: IEngine, platform: string = 'web') {
  // Set platform before engine checks it
  const Runtime = await import('~system/Runtime')
  if ((Runtime as any).setPlatform) {
    ;(Runtime as any).setPlatform(platform)
  }
  // Run frames to allow async platform check to complete
  await engine.update(1)
  await engine.update(1)
  await engine.update(1)
  // Small delay to ensure async promise chain completes
  await new Promise((resolve) => setTimeout(resolve, 10))
}

// Helper to set platform before creating engine (for platform-specific tests)
async function setPlatformBeforeEngine(platform: string) {
  const Runtime = await import('~system/Runtime')
  if ((Runtime as any).setPlatform) {
    ;(Runtime as any).setPlatform(platform)
  }
  if ((Runtime as any).setShouldThrowError) {
    ;(Runtime as any).setShouldThrowError(false)
  }
  // Small delay to ensure mock is set up
  await new Promise((resolve) => setTimeout(resolve, 0))
}

// Helper to make platform check fail (for testing catch block)
async function setPlatformCheckToFail() {
  const Runtime = await import('~system/Runtime')
  if ((Runtime as any).setShouldThrowError) {
    ;(Runtime as any).setShouldThrowError(true)
  }
  // Small delay to ensure mock is set up
  await new Promise((resolve) => setTimeout(resolve, 0))
}

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
    const scaleTween = { ...tween, node: Tween.Mode.Scale({ start: Vector3.Left(), end: Vector3.Right() }) }
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

  describe('Platform-specific tween sequence behavior', () => {
    it('should NOT execute YOYO tween sequence logic when platform is desktop', async () => {
      // Set platform BEFORE creating engine so the check sees desktop
      await setPlatformBeforeEngine('desktop')
      const testEngine = Engine()
      const testTweenSystem = createTweenSystem(testEngine)
      const testTween = components.Tween(testEngine)
      const testTweenState = components.TweenState(testEngine)
      const testTweenSequence = components.TweenSequence(testEngine)
      const testEntity = testEngine.addEntity()

      // Wait for platform check to complete
      await waitForPlatformCheck(testEngine, 'desktop')

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

      // On desktop, YOYO should NOT reverse the tween
      const currentTween = testTween.get(testEntity)
      expect(currentTween.mode).toMatchCloseTo(originalTween.mode)
    })

    it('should execute YOYO tween sequence logic when platform is NOT desktop', async () => {
      // Set platform BEFORE creating engine so the check sees web
      await setPlatformBeforeEngine('web')
      const testEngine = Engine()
      const testTweenSystem = createTweenSystem(testEngine)
      const testTween = components.Tween(testEngine)
      const testTweenState = components.TweenState(testEngine)
      const testTweenSequence = components.TweenSequence(testEngine)
      const testEntity = testEngine.addEntity()

      // Wait for platform check to complete
      await waitForPlatformCheck(testEngine, 'web')

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

      // On non-desktop, YOYO should reverse the tween
      const currentTween = testTween.get(testEntity)
      expect(currentTween.mode).toMatchCloseTo(
        testTween.Mode.Move({ start: Vector3.create(1, 1, 1), end: Vector3.create(0, 0, 0) })
      )
    })

    it('should execute YOYO tween sequence logic when platform detection fails (catch block)', async () => {
      // Make platform check fail BEFORE creating engine
      await setPlatformCheckToFail()
      const testEngine = Engine()
      const testTweenSystem = createTweenSystem(testEngine)
      const testTween = components.Tween(testEngine)
      const testTweenState = components.TweenState(testEngine)
      const testTweenSequence = components.TweenSequence(testEngine)
      const testEntity = testEngine.addEntity()

      // Wait for platform check to complete (it will fail and enable tween sequences by default)
      await waitForPlatformCheck(testEngine, 'web') // platform param doesn't matter when error is thrown

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

      // When platform detection fails, YOYO should still work (tween sequences enabled by default)
      const currentTween = testTween.get(testEntity)
      expect(currentTween.mode).toMatchCloseTo(
        testTween.Mode.Move({ start: Vector3.create(1, 1, 1), end: Vector3.create(0, 0, 0) })
      )
    })
  })
})
