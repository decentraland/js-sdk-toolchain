/**
 * Serializes a value into a storage PUT body, `{ value }`. Rejects a function or a
 * symbol value at any depth and a root that serializes to nothing; everything else
 * follows JSON.stringify.
 * @internal
 */
export function serializeStorageValue(value: unknown, callSite: string): string {
  const envelope = { value }
  const body = JSON.stringify(envelope, function (this: unknown, property, item) {
    if (typeof item === 'function' || typeof item === 'symbol') {
      // At the root the replacer sees the envelope's `value` property; name the value itself instead.
      const where = this === envelope ? 'the value' : `"${property}"`
      throw new TypeError(
        `${callSite}: value must be JSON-serializable, but ${where} is a ${typeof item}. Use delete() to remove a key.`
      )
    }
    return item
  })
  if (body === '{}') {
    throw new TypeError(`${callSite}: value must be JSON-serializable. Use delete() to remove a key.`)
  }
  return body
}
