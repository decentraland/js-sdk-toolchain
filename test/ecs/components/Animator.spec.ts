import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated Animator ProtoBuf', () => {
  it('should serialize/deserialize Animator', () => {
    const newEngine = Engine()
    const { Animator } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()
    Animator.create(newEngine.addEntity())
    const _animator = Animator.create(entity, {
      states: [
        {
          name: 'test',
          clip: 'gge',
          playing: true,
          loop: true,
          shouldReset: false,
          weight: 1,
          speed: 1
        }
      ]
    })

    Animator.create(entityB, {
      states: [
        {
          name: 'test2',
          clip: 'gfgge',
          playing: false,
          loop: false,
          shouldReset: true,
          weight: 0,
          speed: 0
        }
      ]
    })
    const buffer = Animator.toBinary(entity)
    Animator.updateFromBinary(entityB, buffer)

    expect(_animator).toEqual({ ...Animator.getMutable(entityB) })
  })

  it('should Animator.getClip helper works properly', () => {
    const newEngine = Engine()
    const { Animator } = newEngine.baseComponents
    const entityWithoutAnimator = newEngine.addEntity()
    const entity = newEngine.addEntity()

    Animator.create(entity, {
      states: [
        {
          name: 'Some',
          clip: 'ClipSome'
        }
      ]
    })

    expect(Animator.getClip(entityWithoutAnimator, 'Some')).toBeNull()

    expect(Animator.getClip(entity, 'Some')).not.toBeNull()
    expect(Animator.getClip(entity, 'SomeInexistent')).toBeNull()

    expect(Animator.getClip(entity, 'Some')).toStrictEqual({
      name: 'Some',
      clip: 'ClipSome'
    })
  })

  it('should Animator.getClip helper works properly', () => {
    const newEngine = Engine()
    const { Animator } = newEngine.baseComponents
    const entityWithoutAnimator = newEngine.addEntity()
    const entity = newEngine.addEntity()

    Animator.create(entity, {
      states: [
        {
          name: 'Some',
          clip: 'ClipSome'
        }
      ]
    })

    expect(Animator.getClip(entityWithoutAnimator, 'Some')).toBeNull()
    expect(Animator.getClip(entity, 'Some')).not.toBeNull()
    expect(Animator.getClip(entity, 'Some')).toStrictEqual({
      name: 'Some',
      clip: 'ClipSome'
    })
  })

  it('should Animator.playSingleAnim and Animator.stops helper works properly', () => {
    const newEngine = Engine()
    const { Animator } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityWithoutAnimator = newEngine.addEntity()

    Animator.create(entity, {
      states: [
        {
          name: 'Some',
          clip: 'ClipSome'
        }
      ]
    })

    expect(Animator.playSingleAnim(entityWithoutAnimator, 'Some')).toBe(false)

    expect(Animator.getClip(entity, 'Some')!.playing).toBeFalsy()
    expect(Animator.playSingleAnim(entity, 'SomeInexistent')).toBe(false)
    expect(Animator.playSingleAnim(entity, 'Some')).toBe(true)

    expect(Animator.getClip(entity, 'Some')!.playing).toBe(true)

    expect(Animator.stopAnims(entityWithoutAnimator)).toBe(false)
    expect(Animator.stopAnims(entity)).toBe(true)
    expect(Animator.getClip(entity, 'Some')!.playing).toBe(false)
  })
})
