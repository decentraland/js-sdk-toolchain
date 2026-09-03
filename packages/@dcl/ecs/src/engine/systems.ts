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
  // Mirrors `systems` for membership checks: the update loop walks a snapshot,
  // so it needs to know whether a system was removed while the tick ran.
  const activeSystems = new Set<SystemFn>()

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
    activeSystems.add(fn)
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

    const [removed] = systems.splice(index, 1)
    activeSystems.delete(removed.fn)
    sort()
    return true
  }

  return {
    add,
    remove,
    getSystems() {
      return systems
    },
    isActive(fn: SystemFn) {
      return activeSystems.has(fn)
    }
  }
}
