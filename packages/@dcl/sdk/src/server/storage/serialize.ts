const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/
const UNSTORABLE_TEXT = /\u0000/
const MAX_KEY_LENGTH = 255

/**
 * JSON.stringify always writes NUL as `\u0000` and an unpaired surrogate as a `\udXXX` escape (ES2019),
 * while paired surrogates stay raw; an escaped backslash in front means the text is literal.
 */
const ESCAPED_UNSTORABLE_TEXT = /(?<!\\)(?:\\\\)*\\u(?:0000|d[89a-f][0-9a-f]{2})/i

/** Raised from inside the replacer, so it is not mistaken for an engine error. */
class UnstorableValueError extends TypeError {}

type Reason = (holder: Record<string, unknown>, property: string, item: unknown) => string | undefined

/**
 * The `{ value }` PUT body. Rejects, at any depth, what JSON would drop or change: functions,
 * symbols, non-finite numbers, `undefined` array elements and holes, built-ins with no JSON form
 * (Map, Set, typed arrays, RegExp, Error, ...), and text the service cannot store. An `undefined`
 * object property is dropped, as it reads back the same.
 * @internal
 */
export function serializeStorageValue(value: unknown, callSite: string): string {
  const body = stringify(value, callSite, fastReason)
  // Text is checked once on the output; only a rejection pays for locating the offending item.
  if (ESCAPED_UNSTORABLE_TEXT.test(body)) {
    stringify(value, callSite, unstorable)
    throw new TypeError(`${callSite}: value must not contain an unpaired surrogate or a NUL character.`)
  }
  if (body === '{}') {
    throw new TypeError(`${callSite}: value must be JSON-serializable. Use delete() to remove a key.`)
  }
  return body
}

function stringify(value: unknown, callSite: string, reason: Reason): string {
  const envelope = { value }
  try {
    return JSON.stringify(envelope, function (this: Record<string, unknown>, property, item) {
      const why = reason(this, property, item)
      if (why) {
        const where = this === envelope ? 'the value' : `"${property}"`
        throw new UnstorableValueError(
          `${callSite}: value must be JSON-serializable, but ${where} ${why}. Use delete() to remove a key.`
        )
      }
      return item
    })
  } catch (error) {
    if (error instanceof UnstorableValueError) throw error
    const cause = error instanceof Error ? error.message.split('\n')[0] : String(error)
    throw new TypeError(`${callSite}: value must be JSON-serializable (${cause}). Use delete() to remove a key.`)
  }
}

/** Everything but the text checks, with plain objects and arrays skipping the built-in check. */
function fastReason(holder: Record<string, unknown>, property: string, item: unknown): string | undefined {
  switch (typeof item) {
    case 'function':
    case 'symbol':
      return `is a ${typeof item}`
    case 'number':
      return Number.isFinite(item) ? undefined : `is the non-finite number ${item}`
    case 'undefined':
      if (Array.isArray(holder)) return 'is undefined or a hole in an array'
      return holder[property] !== undefined ? 'has a toJSON() that returns undefined' : undefined
    case 'object': {
      if (item === null || Array.isArray(item)) return undefined
      const prototype = Object.getPrototypeOf(item)
      return prototype === Object.prototype || prototype === null ? undefined : builtInReason(item)
    }
    default:
      return undefined
  }
}

/** Every check, per item: used to name the item a text rejection comes from. */
function unstorable(holder: Record<string, unknown>, property: string, item: unknown): string | undefined {
  const fast = fastReason(holder, property, item)
  if (fast) return fast
  if (typeof item === 'string' && (LONE_SURROGATE.test(item) || UNSTORABLE_TEXT.test(item))) {
    return 'contains an unpaired surrogate or a NUL character'
  }
  if (!Array.isArray(holder) && (LONE_SURROGATE.test(property) || UNSTORABLE_TEXT.test(property))) {
    return 'is a key with an unpaired surrogate or a NUL character'
  }
  return undefined
}

function builtInReason(item: unknown): string | undefined {
  const builtIn = builtInName(item)
  return builtIn ? `is ${/^[AEIO]/.test(builtIn) ? 'an' : 'a'} ${builtIn}, which has no JSON form` : undefined
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
  // Counted in characters, as the service counts them.
  if ([...key].length > MAX_KEY_LENGTH) {
    throw new TypeError(`${callSite}: key must be at most ${MAX_KEY_LENGTH} characters.`)
  }
}

/** @internal */
export function assertPlayerAddress(address: unknown, callSite: string): void {
  if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new TypeError(`${callSite}: address must be a 0x-prefixed 20-byte hex address.`)
  }
}
