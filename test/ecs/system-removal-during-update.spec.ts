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

    const added = () => order.push('added')
    let registered = false

    engine.addSystem(() => {
      order.push('first')
      if (!registered) {
        registered = true
        engine.addSystem(added, 250)
      }
    }, 300)
    engine.addSystem(() => order.push('second'), 200)

    await engine.update(1)
  })

  // `main()` runs from a startup system, so everything a scene registers in it is
  // added mid-tick. Holding those back to the second frame would change what a
  // scene puts on screen on its first one.
  it('should run it in the same tick, at its own priority', () => {
    expect(order).toEqual(['first', 'added', 'second'])
  })

  it('should keep running it on later ticks', async () => {
    await engine.update(1)

    expect(order).toEqual(['first', 'added', 'second', 'first', 'added', 'second'])
  })
})

describe('when the same system is removed and added again within one tick', () => {
  let engine: ReturnType<typeof Engine>
  let order: string[]

  beforeEach(async () => {
    engine = Engine()
    order = []

    const moved = () => order.push('moved')

    engine.addSystem(() => {
      order.push('first')
      engine.removeSystem(moved)
      engine.addSystem(moved, 100)
    }, 300)
    engine.addSystem(moved, 200)
    engine.addSystem(() => order.push('last'), 150)

    await engine.update(1)
  })

  it('should run it exactly once', () => {
    expect(order.filter((entry) => entry === 'moved')).toEqual(['moved'])
  })

  it('should run it at the priority it was given the second time', () => {
    expect(order).toEqual(['first', 'last', 'moved'])
  })
})
