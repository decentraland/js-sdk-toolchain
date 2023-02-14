export default <T>() => {
  let value: T | null = null

  const isSet = () => !!value
  const get = () => value
  const set = (newValue: T | null) => (value = newValue) && null
  const getAndUnset = () => {
    const tmp = get()
    unset()
    return tmp
  }
  const unset = () => set(null)

  return {
    isSet,
    get,
    set,
    getAndUnset,
    unset
  }
}
