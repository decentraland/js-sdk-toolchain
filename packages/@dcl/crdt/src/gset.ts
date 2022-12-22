/**
 * This Grow-only set is a implementation with a memory optimization.
 *
 * Each number has a version, no matter how the final compound number is mixed.
 *
 * The function `add` isn't defined (for this implementation), instead, the addTo is: add all versions of a number `n` until (and including) `v`.
 *
 * @returns gset
 */
export function gset() {
  const lastVersion: Map<number, number> = new Map()
  return {
    /**
     *
     * @param n
     * @param v
     * @returns
     */
    addTo(n: number, v: number) {
      if (v < 0) {
        return false
      }

      const currentValue = lastVersion.get(n)

      // If the version is >=, it means the value it's already in the set
      if (currentValue && currentValue >= v) {
        return true
      }

      lastVersion.set(n, v)
      return true
    },
    /**
     * @returns the set with [number, version] of each value
     */
    get() {
      const arr = []
      for (const [n, v] of lastVersion) {
        for (const index of Array.from({ length: v + 1 })) {
          arr.push([n, index])
        }
      }
      return arr
    },
    /**
     * @returns the set with [number, version] of each value
     */
    has(n: number, v: number) {
      const currentValue = lastVersion.get(n)

      // If the version is >=, it means the value it's already in the set
      if (currentValue && currentValue >= v) {
        return true
      }

      return false
    },

    // Map functionality
    getMap() {
      return new Map(lastVersion)
    },
    getLastVersionOfN(n: number) {
      return lastVersion.get(n)
    }
  }
}
