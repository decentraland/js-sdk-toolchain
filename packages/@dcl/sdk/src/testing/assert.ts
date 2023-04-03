// VERBATIM COPY OF https://github.com/LemonPi/deep-close-to

import type { Entity, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'

const pSlice = Array.prototype.slice

const floatEpsilon = 0.0000001

type Options = { strict: boolean; comp: typeof closeTo }

export function assertEquals(a: any, b: any, message: string = 'Values are not equal') {
  if (!deepCloseTo(a, b)) throw new Error(`${message} - ${JSON.stringify(a)} != ${JSON.stringify(b)}`)
}

export function assert(a: any, message: string = 'assertion failed') {
  if (!a) throw new Error(message)
}

export function assertComponentValue<T>(
  entity: Entity,
  component: LastWriteWinElementSetComponentDefinition<T>,
  value: T
) {
  assert(component.has(entity), `The entity doesn't have a ${component.componentName} component`)
  assertEquals(component.get(entity)!, value, `Invalid ${component.componentName} values`)
}

export function deepCloseTo(actual: any, expected: any, options: Partial<Options> = {}): boolean {
  const opts = Object.assign({}, { comp: closeTo }, options)
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true
  } else if (actual instanceof Date && expected instanceof Date) {
    return opts.comp!(actual, expected)

    // 7.3. Other pairs that do not both pass typeof value == 'object',
    // equivalence is determined by ==.
  } else if (!actual || !expected || (typeof actual !== 'object' && typeof expected !== 'object')) {
    if (opts.strict) {
      if (!actual && !expected) {
        return actual === expected
      }

      if (typeof actual !== typeof expected) {
        return false
      }
    }
    if (!actual && !expected) {
      return actual === expected
    }
    return opts.comp!(actual, expected)

    // 7.4. For all other Object pairs, including Array objects, equivalence is
    // determined by having the same number of owned properties (as verified
    // with Object.prototype.hasOwnProperty.call), the same set of keys
    // (although not necessarily the same order), equivalent values for every
    // corresponding key, and an identical 'prototype' property. Note: this
    // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected, opts as any)
  }
}

function isUndefinedOrNull(value: any) {
  return value === null || value === undefined
}

function isBuffer(x: any) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false
  }
  if (x.length > 0 && typeof x[0] !== 'number') return false
  return true
}

function objEquiv(a: any, b: any, opts: Options) {
  let i, key
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b)) return false
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false
    }
    return deepCloseTo(pSlice.call(a), pSlice.call(b), opts)
  }
  if (isBuffer(a)) {
    if (!isBuffer(b)) {
      return false
    }
    if (a.length !== b.length) return false
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  try {
    const ka = Object.keys(a)
    const kb = Object.keys(b)

    // having the same number of owned properties (keys incorporates
    // hasOwnProperty)
    if (ka.length !== kb.length) return false
    //the same set of keys (although not necessarily the same order),
    ka.sort()
    kb.sort()
    //~~~cheap key test
    for (i = ka.length - 1; i >= 0; i--) {
      if (ka[i] !== kb[i]) return false
    }
    //equivalent values for every corresponding key, and
    //~~~possibly expensive deep test
    for (i = ka.length - 1; i >= 0; i--) {
      key = ka[i]
      if (!deepCloseTo(a[key], b[key], opts)) return false
    }
  } catch (e) {
    //happens when one is a string literal and the other isn't
    return false
  }

  return typeof a === typeof b
}

function isArguments(object: any) {
  return Object.prototype.toString.call(object) === '[object Arguments]'
}
function closeTo(actual: any, expected: any, delta: number = floatEpsilon) {
  return Math.abs(actual - expected) < delta
}
