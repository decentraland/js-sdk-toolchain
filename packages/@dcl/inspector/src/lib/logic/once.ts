export function memoize<K extends object, P, V>(cb: (a: K, ...params: P[]) => V): (a: K, ...params: P[]) => V {
  const memoized = new WeakMap<K, V>()
  return (a: K, ...params: P[]) => {
    if (!memoized.has(a)) {
      const ret = cb(a, ...params)
      memoized.set(a, ret)
      return ret
    }
    return memoized.get(a)!
  }
}
