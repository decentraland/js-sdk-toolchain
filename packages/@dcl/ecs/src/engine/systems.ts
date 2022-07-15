/**
 * @public
 */
export type Update = (dt: number) => void

export type SystemId = number

export const SYSTEMS_REGULAR_PRIORITY = 100e3

type SystemItem = {
  id: SystemId
  fn: Update
  priority: number
}

export function SystemContainer() {
  let autoIncrementId = 0
  const systems: SystemItem[] = []

  function sort() {
    systems.sort((a, b) => b.priority - a.priority)
  }

  function add(fn: Update, priority: number): SystemId {
    const id = autoIncrementId++

    if (systems.findIndex((item) => item.fn === fn) !== -1) {
      throw new Error('System already added')
    }

    systems.push({
      fn,
      priority,
      id
    })
    sort()
    return id
  }

  function remove(id: SystemId) {
    const index = systems.findIndex((item) => item.id === id)

    if (index === -1) {
      return false
    }

    systems.splice(index, 1)
    sort()
    return true
  }

  return {
    add,
    remove,
    getSystems() {
      return systems
    }
  }
}
