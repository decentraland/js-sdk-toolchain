import { Engine, Schemas } from '../../packages/@dcl/ecs/src'
import { Transport } from '../../packages/@dcl/ecs/src/systems/crdt/types'

type FilterMessage = Parameters<Transport['filter']>[0]

describe('when a local CRDT update is accepted by multiple transports', () => {
  let engine: ReturnType<typeof Engine>
  let firstFilter: jest.Mock<boolean, [FilterMessage]>
  let secondFilter: jest.Mock<boolean, [FilterMessage]>

  beforeEach(async () => {
    firstFilter = jest.fn((_message: FilterMessage) => true)
    secondFilter = jest.fn((_message: FilterMessage) => true)
    const transports: Transport[] = [firstFilter, secondFilter].map((filter) => ({
      filter,
      send: jest.fn(async () => undefined)
    }))
    engine = Engine()
    transports.forEach(engine.addTransport)
    const component = engine.defineComponent('test::TransportFilter', { value: Schemas.Int })
    component.create(engine.addEntity(), { value: 1 })

    await engine.update(1 / 30)
  })

  it('should evaluate each transport filter only once', () => {
    expect(firstFilter).toHaveBeenCalledTimes(1)
    expect(secondFilter).toHaveBeenCalledTimes(1)
  })
})
