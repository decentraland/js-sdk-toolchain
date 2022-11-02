import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { taskSystem } from '../../packages/@dcl/ecs/src/systems/async-task'

describe('Execute Task', () => {
  it('should run async tasks in the engine', () => {
    const engine = Engine()
    const { executeTask } = taskSystem(engine)

    let counter = 0

    async function task() {
      counter++
    }

    executeTask(task)
    expect(counter).toBe(0)
    engine.update(1)
    expect(counter).toBe(1)
    engine.update(1)
    expect(counter).toBe(1)
  })

  it('should catch the error and log it', async () => {
    ;(globalThis as any).dcl = {
      error: jest.fn()
    }
    const engine = Engine()
    const { executeTask } = taskSystem(engine)
    async function errorFn() {
      throw 1
    }
    executeTask(errorFn)
    engine.update(1)

    // flush the callback event looper
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(dcl.error).toBeCalledWith('executeTask: FAILED. 1', 1)
  })
})
