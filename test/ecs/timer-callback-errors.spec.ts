import { Engine, IEngine } from '../../packages/@dcl/ecs/src'
import { createTimers, Timers } from '../../packages/@dcl/ecs/src/runtime/helpers/timers'

describe('timer callback errors', () => {
  let callback: jest.Mock
  let engine: IEngine
  let throwingCallback: jest.Mock
  let timers: Timers

  beforeEach(() => {
    callback = jest.fn()
    engine = Engine()
    throwingCallback = jest.fn(() => {
      throw new Error('timer failed')
    })
    timers = createTimers(engine)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('when a timer callback throws', () => {
    beforeEach(async () => {
      timers.setTimeout(throwingCallback, 100)
      await engine.update(0.1).catch(() => undefined)
      timers.setTimeout(callback, 100)
    })

    it('should measure a later timer from the next frame normally', async () => {
      await engine.update(0.1)

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
})
