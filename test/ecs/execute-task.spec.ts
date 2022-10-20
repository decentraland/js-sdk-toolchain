import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { taskSystem } from '../../packages/@dcl/ecs/src/systems/async-task'

describe('Execute Task', () => {
  it('should run async tasks in the engine', () => {
    const engine = Engine({ transports: [] })
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
})
