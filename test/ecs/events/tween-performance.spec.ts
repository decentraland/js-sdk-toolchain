import {
  EasingFunction,
  Engine,
  Entity,
  IEngine,
  TweenComponentDefinitionExtended,
  components
} from '../../../packages/@dcl/ecs/src'
import { createTweenSystem } from '../../../packages/@dcl/ecs/src/systems/tween'
import { Vector3 } from '../../../packages/@dcl/sdk/math'

describe('when an active tween is unchanged between frames', () => {
  let engine: IEngine
  let entity: Entity
  let Tween: TweenComponentDefinitionExtended
  let serializeSpy: jest.SpyInstance

  beforeEach(async () => {
    engine = Engine()
    Object.defineProperty(engine, '_id', { value: Number.MAX_SAFE_INTEGER })
    createTweenSystem(engine)
    Tween = components.Tween(engine)
    entity = engine.addEntity()
    Tween.create(entity, {
      duration: 1000,
      easingFunction: EasingFunction.EF_LINEAR,
      mode: Tween.Mode.Move({ start: Vector3.Zero(), end: Vector3.One() })
    })
    await engine.update(1)
    serializeSpy = jest.spyOn(Tween.schema, 'serialize')
  })

  afterEach(() => {
    serializeSpy.mockRestore()
  })

  it('should not serialize the tween again on the following frame', async () => {
    await engine.update(1)

    expect(serializeSpy).not.toHaveBeenCalled()
  })
})
