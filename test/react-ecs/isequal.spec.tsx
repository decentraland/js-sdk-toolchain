import { isEqual } from '../../packages/@dcl/react-ecs/src/reconciler/utils'

describe('UiBackground React Ecs', () => {
  it('should remove backgrund component', () => {
    // Arrays
    expect(isEqual([], [])).toBe(true)
    expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(isEqual([1, 2, 3], [1, 2, 3, 4])).toBe(false)
    expect(isEqual([1, 2], [1, 2, 3])).toBe(false)
    const a = [1, 2, 3, 4]
    expect(isEqual(a, a)).toBe(true)
    expect(isEqual(a, [1, 2, 3, 4])).toBe(true)

    // Objects
    const b = { a: 1, b: 2 }
    expect(isEqual(b, { a: 1, b: 2 })).toBe(true)
    expect(isEqual(b, b)).toBe(true)
    expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 2, c: 3 })).toBe(false)
    expect(isEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false)

    // Nested objects

    expect(isEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false)
    expect(isEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(isEqual(1, '1')).toBe(false)
  })
})
