import * as objUtils from '../../../../packages/@dcl/sdk/cli/utils/object'

describe('utils/object', () => {
  it('isPrimitive: should return true if value is a primivite', () => {
    expect(objUtils.isPrimitive('test')).toBe(true)
    expect(objUtils.isPrimitive(1)).toBe(true)

    expect(objUtils.isPrimitive([])).toBe(false)
    expect(objUtils.isPrimitive({})).toBe(false)
    expect(objUtils.isPrimitive(true)).toBe(false)
    expect(objUtils.isPrimitive(null)).toBe(false)
    expect(objUtils.isPrimitive(undefined)).toBe(false)
    expect(objUtils.isPrimitive(NaN)).toBe(false)
    expect(objUtils.isPrimitive('')).toBe(false)
  })

  it('eqPrimitive: should return true if two primitives are equal', () => {
    expect(objUtils.eqPrimitive('test', 'test')).toBe(true)
    expect(objUtils.eqPrimitive(0, 0)).toBe(true)

    expect(objUtils.eqPrimitive('test', 'non-test')).toBe(false)
    expect(objUtils.eqPrimitive(123, 123)).toBe(true)
    expect(objUtils.eqPrimitive(123, 1234)).toBe(false)
  })

  it('isObject: should return true if value is an object', () => {
    expect(objUtils.isObject({})).toBe(true)
    expect(objUtils.isObject({ key: 1 })).toBe(true)

    expect(objUtils.isObject(1)).toBe(false)
    expect(objUtils.isObject('test')).toBe(false)
    expect(objUtils.isObject([])).toBe(false)
    expect(objUtils.isObject([{ key: 1 }])).toBe(false)
    expect(objUtils.isObject(NaN)).toBe(false)
    expect(objUtils.isPrimitive(true)).toBe(false)
    expect(objUtils.isPrimitive(null)).toBe(false)
    expect(objUtils.isPrimitive(undefined)).toBe(false)
  })

  it('hasPrimitiveKeys: should return true if two objects contains same structure (with an optional list of values)', () => {
    expect(objUtils.hasPrimitiveKeys({ key: 1 }, { key: 1 })).toBe(true)
    expect(objUtils.hasPrimitiveKeys({ key: 1 }, { key: [2, 1] })).toBe(true)
    expect(
      objUtils.hasPrimitiveKeys({ key: { key2: 1 } }, { key: { key2: 1 } })
    ).toBe(true)
    expect(
      objUtils.hasPrimitiveKeys({ key: [1, 2, 3] }, { key: [1, 2, 3] })
    ).toBe(true)
    expect(
      objUtils.hasPrimitiveKeys(
        { key: { key2: 3 } },
        { key: { key2: [1, 2, 3] } }
      )
    ).toBe(true)

    expect(objUtils.hasPrimitiveKeys({ key: 1 }, { key: 2 })).toBe(false)
    expect(objUtils.hasPrimitiveKeys({ key: 1 }, { key2: 1 })).toBe(false)
    expect(
      objUtils.hasPrimitiveKeys({ key: { key2: 1 } }, { key: { key2: 2 } })
    ).toBe(false)
    expect(
      objUtils.hasPrimitiveKeys({ key: { key2: 1 } }, { key: { key3: 1 } })
    ).toBe(false)
    expect(objUtils.hasPrimitiveKeys({ key: [1, 2, 3] }, { key: [1] })).toBe(
      false
    )
    expect(objUtils.hasPrimitiveKeys({ key: 1 }, { key: [4] })).toBe(false)
    expect(objUtils.hasPrimitiveKeys({ key: [1] }, { key: 1 })).toBe(false)
  })
})
