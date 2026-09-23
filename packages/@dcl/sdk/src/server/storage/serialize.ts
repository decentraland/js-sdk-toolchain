/**
 * The `{ value }` PUT body. Rejects, at any depth, what JSON would drop or change: functions,
 * symbols, non-finite numbers (written as null), and Map and Set (written as {}).
 * @internal
 */
export function serializeStorageValue(value: unknown, callSite: string): string {
  const envelope = { value }
  const body = JSON.stringify(envelope, function (this: unknown, property, item) {
    const kind = unsupportedKind(item)
    if (kind) {
      // At the root the replacer sees the envelope.
      const where = this === envelope ? 'the value' : `"${property}"`
      throw new TypeError(
        `${callSite}: value must be JSON-serializable, but ${where} is ${kind}. Use delete() to remove a key.`
      )
    }
    return item
  })
  if (body === '{}') {
    throw new TypeError(`${callSite}: value must be JSON-serializable. Use delete() to remove a key.`)
  }
  return body
}

function unsupportedKind(item: unknown): string | undefined {
  if (typeof item === 'function' || typeof item === 'symbol') return `a ${typeof item}`
  if (typeof item === 'number' && !Number.isFinite(item)) return `the non-finite number ${item}`
  if (item instanceof Map) return 'a Map'
  if (item instanceof Set) return 'a Set'
  return undefined
}
