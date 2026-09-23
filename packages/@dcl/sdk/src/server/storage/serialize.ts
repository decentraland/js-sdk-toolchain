/**
 * Serializes a value into a storage PUT body, `{ value }`, rejecting what
 * JSON.stringify would otherwise drop silently: a function or a symbol anywhere
 * in the value, or a root that serializes to nothing. Undefined properties are
 * dropped as JSON does, since an absent and an undefined property read back alike.
 * @internal
 */
export function serializeStorageValue(value: unknown, call: string): string {
  const body = JSON.stringify({ value }, (property, item) => {
    if (typeof item === 'function' || typeof item === 'symbol') {
      throw new TypeError(
        `${call}: value must be JSON-serializable, but "${property}" is a ${typeof item}. Use delete() to remove a key.`
      )
    }
    return item
  })
  if (body === '{}') {
    throw new TypeError(`${call}: value must be JSON-serializable. Use delete() to remove a key.`)
  }
  return body
}
