/**
 * @public
 */
export type Update = (dt: number) => void

export const SYSTEMS_REGULAR_PRIORITY = 100e3

type SystemItem = {
  fn: Update
  priority: number
  name?: string
}

export function SystemContainer() {
  const systems: SystemItem[] = []

  function sort() {
    systems.sort((a, b) => b.priority - a.priority)
  }

  function add(fn: Update, priority: number, name?: string): void {
    if (systems.find((item) => item.fn === fn)) {
      throw new Error('System already added')
    } else if (name && systems.find((item) => item.name === name)) {
      throw new Error('System name already used')
    }

    systems.push({
      fn,
      priority,
      name
    })
    sort()
  }

  function remove(selector: string | Update) {
    let index = -1

    if (typeof selector === 'string') {
      index = systems.findIndex((item) => item.name === selector)
    } else {
      index = systems.findIndex((item) => item.fn === selector)
    }

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
