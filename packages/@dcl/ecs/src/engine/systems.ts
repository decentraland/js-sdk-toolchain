/**
 * @public
 */
export type SystemFn = (dt: number) => void

export const SYSTEMS_REGULAR_PRIORITY = 100e3

export type SystemItem = {
  fn: SystemFn
  priority: number
  name?: string
}

export function SystemContainer() {
  const systems: SystemItem[] = []

  function sort() {
    // TODO: systems with the same priority should always have the same stable order
    //       add a "counter" to the System type to ensure that order
    systems.sort((a, b) => b.priority - a.priority)
  }

  function add(fn: SystemFn, priority: number, name?: string): void {
    const systemName = name ?? fn.name

    if (systems.find((item) => item.fn === fn)) {
      throw new Error(`System ${JSON.stringify(systemName)} already added to the engine`)
    }

    systems.push({
      fn,
      priority,
      name: systemName
    })
    // TODO: replace this sort by an insertion in the right place
    sort()
  }

  function remove(selector: string | SystemFn) {
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
