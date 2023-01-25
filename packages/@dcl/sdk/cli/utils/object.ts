export type Primitive = string | number
export type Dict = { [key: string]: Dict | Primitive | Primitive[] }

/*
 * Returns true if value is a "Primitive"
 */
export const isPrimitive = (value: any): value is Primitive =>
  (typeof value === 'string' && value.length > 0) || (typeof value === 'number' && !Number.isNaN(value))

/*
 * Returns true if both parameters are equal
 */
export const eqPrimitive = (value: Primitive, value2: Primitive): boolean => value === value2

/*
 * Returns true if value is a JS Object
 */
export const isObject = (value: any): value is Dict =>
  typeof value === 'object' && !Array.isArray(value) && value !== null

/*
 * Returns true if second paramter is a "Primitive" and equal to first parameter
 */
export const isPrimitiveEqualTo = (val: Primitive, val2: any): val2 is Primitive =>
  isPrimitive(val2) && eqPrimitive(val, val2)

/*
 * Returns true if "original" has all of the props described in "comparator"
 * NOTE: comparator can provide a list of valid "Primitives" to match values from "original"
 * EX:
 * original = { prop1: "some-val" }
 * comparator = { prop1: [1, 2, "some-val"] }
 * will return true
 */
export const hasPrimitiveKeys = <T extends Dict>(original: Record<string, unknown>, comparator: T): boolean => {
  for (const [key, value] of Object.entries(comparator)) {
    const originalValue = original[key]
    if (originalValue === undefined) {
      return false
    } else if (isPrimitive(value) && !isPrimitiveEqualTo(value, originalValue)) {
      return false
    } else if (Array.isArray(value)) {
      if (Array.isArray(originalValue)) {
        const set = new Set(value)
        for (const v of originalValue) {
          if (!set.has(v)) return false
        }
      } else {
        const foundPrimitive = value.some((val) => isPrimitive(val) && isPrimitiveEqualTo(val, originalValue))
        if (!foundPrimitive) {
          return false
        }
      }
    } else if (isObject(value)) {
      if (isObject(originalValue) && !hasPrimitiveKeys(originalValue, value)) {
        return false
      }
    }
  }

  return true
}
