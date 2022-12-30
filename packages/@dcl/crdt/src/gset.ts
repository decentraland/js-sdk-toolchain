/**
 * This Grow-only set is a implementation with a memory optimization.
 *
 * Each number has a version, no matter how the final compound number is mixed.
 *
 * The function `add` isn't defined (for this implementation), instead, the addTo is: add all versions of a number `n` until (and including) `v`.
 *
 */
export type OptimizedGrowonlySet = {
  /**
   * @public
   *
   * @param n
   * @param v
   * @returns
   */
  addTo(n: number, v: number): boolean

  /**
   * @public
   *
   * @returns the set with [number, version] of each value
   */
  get(): [number, number][]

  /**
   * @public
   *
   * @returns the set with [number, version] of each value
   */
  has(n: number, v: number): boolean

  /**
   * @internal
   * @returns
   */
  getMap(): Map<number, number>
}

/**
 *
 * @returns a new GSet
 */
export function createGSet(): OptimizedGrowonlySet {
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
      if (currentValue !== undefined && currentValue >= v) {
        return true
      }

      lastVersion.set(n, v)
      return true
    },
    /**
     * @returns the set with [number, version] of each value
     */
    get() {
      const arr: [number, number][] = []
      for (const [n, v] of lastVersion) {
        for (let i = 0; i <= v; i++) {
          arr.push([n, i])
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
      if (currentValue !== undefined && currentValue >= v) {
        return true
      }

      return false
    },

    /**
     * Warning: this function returns the reference to the internal map,
     *  if you need to mutate some value, make a copy.
     * For optimization purpose the copy isn't made here.
     *
     * @returns the map of number to version
     */
    getMap() {
      return lastVersion
    }
  }
}
