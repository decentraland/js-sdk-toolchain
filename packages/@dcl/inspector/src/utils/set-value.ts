export default <T extends {}>() => {
  let value: T | null = null
  return {
    isSet: () => !!value,
    get: () => value,
    set: (newValue: T | null) => (value = newValue) && null,
    getAndUnset: () => {
      const tmp = value
      value = null
      return tmp
    },
    unset: () => (value = null) && null,
  }
}
