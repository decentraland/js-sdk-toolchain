import { Engine } from '../../packages/@dcl/ecs/dist'
import { definePlayerHelper } from '../../packages/@dcl/sdk/src/players'

describe('when player event callbacks are not registered', () => {
  let engine: ReturnType<typeof Engine>
  let getEntitiesWithSpy: jest.SpyInstance

  beforeEach(() => {
    engine = Engine()
    definePlayerHelper(engine)
    getEntitiesWithSpy = jest.spyOn(engine, 'getEntitiesWith')
  })

  afterEach(() => {
    getEntitiesWithSpy.mockRestore()
  })

  it('should skip player discovery work during engine updates', async () => {
    await engine.update(1 / 30)

    expect(getEntitiesWithSpy).not.toHaveBeenCalled()
  })
})
