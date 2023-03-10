export function memoize<K extends object, V>(cb: (a: K) => V): (a: K) => V {
  const memoized = new WeakMap<K, V>()
  return (a: K) => {
    if (!memoized.has(a)) {
      const ret = cb(a)
      memoized.set(a, ret)
      return ret
    }
    return memoized.get(a)!
  }
}
