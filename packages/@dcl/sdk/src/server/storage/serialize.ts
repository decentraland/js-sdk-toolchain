const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/
const UNSTORABLE_TEXT = /\u0000/

/** Raised from inside the replacer, so it is not mistaken for an engine error. */
class UnstorableValueError extends TypeError {}

/**
 * The `{ value }` PUT body. Rejects, at any depth, what JSON would drop or change: functions,
 * symbols, non-finite numbers, `undefined` array elements and holes, built-ins with no JSON form
 * (Map, Set, typed arrays, RegExp, Error, ...), and text the service cannot store. An `undefined`
 * object property is dropped, as it reads back the same.
 * @internal
 */
export function serializeStorageValue(value: unknown, callSite: string): string {
  const envelope = { value }
  let body: string | undefined
  try {
    body = JSON.stringify(envelope, function (this: Record<string, unknown>, property, item) {
      const where = this === envelope ? 'the value' : `"${property}"`
      const reason = unstorable(this, property, item)
      if (reason) {
        throw new UnstorableValueError(
          `${callSite}: value must be JSON-serializable, but ${where} ${reason}. Use delete() to remove a key.`
        )
      }
      return item
    })
  } catch (error) {
    if (error instanceof UnstorableValueError) throw error
    // BigInt, a circular value, or nesting deeper than the engine's stack.
    const cause = error instanceof Error ? error.message.split('\n')[0] : String(error)
    throw new TypeError(`${callSite}: value must be JSON-serializable (${cause}). Use delete() to remove a key.`)
  }
  if (body === '{}') {
    throw new TypeError(`${callSite}: value must be JSON-serializable. Use delete() to remove a key.`)
  }
  return body
}

function unstorable(holder: Record<string, unknown>, property: string, item: unknown): string | undefined {
  if (typeof item === 'function' || typeof item === 'symbol') return `is a ${typeof item}`
  if (typeof item === 'number' && !Number.isFinite(item)) return `is the non-finite number ${item}`
  if (item === undefined) {
    if (Array.isArray(holder)) return 'is undefined or a hole in an array'
    if (holder[property] !== undefined) return 'has a toJSON() that returns undefined'
  }
  if (typeof item === 'string' && (LONE_SURROGATE.test(item) || UNSTORABLE_TEXT.test(item))) {
    return 'contains an unpaired surrogate or a NUL character'
  }
  if (!Array.isArray(holder) && (LONE_SURROGATE.test(property) || UNSTORABLE_TEXT.test(property))) {
    return 'is a key with an unpaired surrogate or a NUL character'
  }
  const builtIn = builtInName(item)
  if (builtIn) return `is ${/^[AEIO]/.test(builtIn) ? 'an' : 'a'} ${builtIn}, which has no JSON form`
  return undefined
}

function builtInName(item: unknown): string | undefined {
  if (item === null || typeof item !== 'object') return undefined
  if (item instanceof Map) return 'Map'
  if (item instanceof Set) return 'Set'
  if (item instanceof WeakMap) return 'WeakMap'
  if (item instanceof WeakSet) return 'WeakSet'
  if (item instanceof RegExp) return 'RegExp'
  if (item instanceof Error) return 'Error'
  if (item instanceof Promise) return 'Promise'
  if (item instanceof ArrayBuffer) return 'ArrayBuffer'
  if (ArrayBuffer.isView(item)) return item.constructor?.name ?? 'typed array'
  return undefined
}

/**
 * Keys and player addresses go into the request path, where `.`, `..` and an empty segment are
 * resolved away by URL parsing, so they would address a different resource.
 * @internal
 */
export function assertStorageKey(key: unknown, callSite: string): void {
  if (typeof key !== 'string' || key === '' || key === '.' || key === '..') {
    throw new TypeError(`${callSite}: key must be a non-empty string other than "." and "..".`)
  }
  if (LONE_SURROGATE.test(key) || UNSTORABLE_TEXT.test(key)) {
    throw new TypeError(`${callSite}: key must not contain an unpaired surrogate or a NUL character.`)
  }
}

/** @internal */
export function assertPlayerAddress(address: unknown, callSite: string): void {
  if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new TypeError(`${callSite}: address must be a 0x-prefixed 20-byte hex address.`)
  }
}
