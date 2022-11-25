import { IEngine } from '../engine'

export type Task<T = unknown> = () => Promise<T>

function getAndClean<T = unknown>(value: T[]) {
  const messagesToProcess = Array.from(value)
  value.length = 0
  return messagesToProcess
}

export function taskSystem(engine: IEngine) {
  const tasks: Task[] = []

  async function runTask(task: Task) {
    try {
      const resp = await task()
      return resp
    } catch (e: any) {
      throw e
      // TODO: dcl.error(`executeTask: FAILED. ${e.toString()}`, e)
    }
  }

  function executeTasks() {
    for (const task of getAndClean(tasks)) {
      runTask(task).catch(() => {})
    }
  }

  engine.addSystem(executeTasks)

  return {
    executeTask(task: Task) {
      tasks.push(task)
    }
  }
}
