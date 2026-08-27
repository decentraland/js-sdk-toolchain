import { EasingFunction, Engine, IEngine, TweenStateStatus, components } from '../../../packages/@dcl/ecs/src'
import { createTweenSystem } from '../../../packages/@dcl/ecs/src/systems/tween'
import { Vector3 } from '../../../packages/@dcl/sdk/math'

/**
 * createTweenSystem memoizes per engine._id in a module-level map, so each suite needs a
 * distinct id or it receives another suite's system.
 */
function setupTweenEngine(id: number) {
  const engine = Engine()
  Object.defineProperty(engine, '_id', { value: id })
  createTweenSystem(engine)
  const Tween = components.Tween(engine)
  const entity = engine.addEntity()
  Tween.create(entity, {
    duration: 1000,
    easingFunction: EasingFunction.EF_LINEAR,
    mode: Tween.Mode.Move({ start: Vector3.Zero(), end: Vector3.One() })
  })
  return { Tween, engine, entity }
}

describe('tween dirty tracking', () => {
  describe('when an active tween is unchanged between frames', () => {
    let engine: IEngine
    let serializeSpy: jest.SpyInstance

    beforeEach(async () => {
      const setup = setupTweenEngine(Number.MAX_SAFE_INTEGER)
      engine = setup.engine
      await engine.update(1)
      serializeSpy = jest.spyOn(setup.Tween.schema, 'serialize')

      await engine.update(1)
    })

    afterEach(() => {
      serializeSpy.mockRestore()
    })

    it('should not serialize the tween again', () => {
      expect(serializeSpy).not.toHaveBeenCalled()
    })
  })

  describe('when an active tween is mutated', () => {
    let engine: IEngine
    let serializeSpy: jest.SpyInstance

    beforeEach(async () => {
      const setup = setupTweenEngine(Number.MAX_SAFE_INTEGER - 1)
      engine = setup.engine
      await engine.update(1)
      serializeSpy = jest.spyOn(setup.Tween.schema, 'serialize')

      setup.Tween.getMutable(setup.entity).duration = 2000
      await engine.update(1)
    })

    afterEach(() => {
      serializeSpy.mockRestore()
    })

    it('should serialize the tween again', () => {
      expect(serializeSpy).toHaveBeenCalled()
    })
  })

  describe('when a tween is removed and an identical one is created', () => {
    let completedAgain: boolean

    beforeEach(async () => {
      const engine = Engine()
      Object.defineProperty(engine, '_id', { value: Number.MAX_SAFE_INTEGER - 2 })
      const tweenSystem = createTweenSystem(engine)
      const Tween = components.Tween(engine)
      const TweenState = components.TweenState(engine)
      const entity = engine.addEntity()
      const spec = {
        duration: 1000,
        easingFunction: EasingFunction.EF_LINEAR,
        mode: Tween.Mode.Move({ start: Vector3.Zero(), end: Vector3.One() })
      }

      Tween.create(entity, spec)
      TweenState.createOrReplace(entity, { state: TweenStateStatus.TS_COMPLETED, currentTime: 1 })
      await engine.update(1)
      await engine.update(1)
      await engine.update(1)

      // Same bytes as before: a surviving cache entry would still carry completed: true
      // and swallow the new tween's completion.
      Tween.deleteFrom(entity)
      await engine.update(1)
      Tween.createOrReplace(entity, spec)
      TweenState.createOrReplace(entity, { state: TweenStateStatus.TS_COMPLETED, currentTime: 1 })

      completedAgain = false
      for (let frame = 0; frame < 5; frame++) {
        await engine.update(1)
        if (tweenSystem.tweenCompleted(entity)) completedAgain = true
      }
    })

    it('should report the new tween as completed rather than reusing the dropped cache entry', () => {
      expect(completedAgain).toBe(true)
    })
  })
})
