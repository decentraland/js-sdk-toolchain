import { Engine } from '../../packages/@dcl/ecs/src/engine'

describe('when a system removes itself while the tick is running', () => {
  let engine: ReturnType<typeof Engine>
  let order: string[]

  beforeEach(async () => {
    engine = Engine()
    order = []

    const first = () => {
      order.push('first')
      engine.removeSystem(first)
    }
    engine.addSystem(first, 300)
    engine.addSystem(() => order.push('second'), 200)
    engine.addSystem(() => order.push('third'), 100)

    await engine.update(1)
  })

  it('should still run the systems that come after it', () => {
    expect(order).toEqual(['first', 'second', 'third'])
  })

  it('should not run it again on the next tick', async () => {
    await engine.update(1)

    expect(order).toEqual(['first', 'second', 'third', 'second', 'third'])
  })
})

describe('when a system removes another one that has not run yet this tick', () => {
  let engine: ReturnType<typeof Engine>
  let order: string[]

  beforeEach(async () => {
    engine = Engine()
    order = []

    const later = () => order.push('later')
    engine.addSystem(() => {
      order.push('first')
      engine.removeSystem(later)
    }, 300)
    engine.addSystem(later, 200)
    engine.addSystem(() => order.push('last'), 100)

    await engine.update(1)
  })

  it('should not run the removed system', () => {
    expect(order).not.toContain('later')
  })

  it('should run the rest', () => {
    expect(order).toEqual(['first', 'last'])
  })
})

describe('when a system is added while the tick is running', () => {
  let engine: ReturnType<typeof Engine>
  let order: string[]

  beforeEach(async () => {
    engine = Engine()
    order = []

    engine.addSystem(() => {
      order.push('first')
      engine.addSystem(() => order.push('added'), 250)
    }, 300)
    engine.addSystem(() => order.push('second'), 200)

    await engine.update(1)
  })

  it('should leave the systems that were already scheduled running', () => {
    expect(order).toEqual(['first', 'second'])
  })

  it('should run the new one from the next tick', async () => {
    await engine.update(1)

    expect(order).toEqual(['first', 'second', 'first', 'added', 'second'])
  })
})
