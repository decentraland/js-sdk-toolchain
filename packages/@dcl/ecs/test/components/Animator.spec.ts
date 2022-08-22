import { Engine } from '../../src/engine'

describe('Generated BoxShape ProtoBuf', () => {
  it('should serialize/deserialize BoxShape', () => {
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
})
