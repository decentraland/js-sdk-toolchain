import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { createTaskSystem } from '../../packages/@dcl/ecs/src/systems/async-task'

declare let process: any

describe('Execute Task', () => {
  it('should run async tasks in the engine', async () => {
    const engine = Engine()
    const executeTask = createTaskSystem(engine)

    let counter = 0

    async function task() {
      counter++
    }

    executeTask(task)
    expect(counter).toBe(0)
    await engine.update(1)
    expect(counter).toBe(1)
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('should catch the error and log it', async () => {
    const error = jest.spyOn(console, 'error')
    const engine = Engine()
    const executeTask = createTaskSystem(engine)
    async function errorFn() {
      throw 'Error bubbles to console'
    }
    executeTask(errorFn)
    await engine.update(1)

    // flush the callback event looper
    await new Promise(process.nextTick)
    expect(error).toBeCalledWith('Error bubbles to console')
  })
})
