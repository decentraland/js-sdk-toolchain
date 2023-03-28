import { IEngine } from '../engine'

export type Task<T = unknown> = () => Promise<T>

function getAndClean<T = unknown>(value: T[]) {
  const messagesToProcess = Array.from(value)
  value.length = 0
  return messagesToProcess
}

/**
 * @internal
 */
export function createTaskSystem(engine: IEngine) {
  const tasks: Task[] = []

  async function runTask(task: Task) {
    try {
      const resp = await task()
      return resp
    } catch (e: any) {
      console.error(e)
    }
  }

  function executeTasks() {
    for (const task of getAndClean(tasks)) {
      runTask(task).catch(console.error)
    }
  }

  engine.addSystem(executeTasks)

  return function (task: Task) {
    tasks.push(task)
  }
}
