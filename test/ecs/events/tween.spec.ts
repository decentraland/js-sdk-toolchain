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
import { Quaternion, Vector3 } from '../../../packages/@dcl/sdk/math'

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
    // We need this updates in order to have at least 3 frames. (min amount of frames so a tween can consider completed)
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
})
