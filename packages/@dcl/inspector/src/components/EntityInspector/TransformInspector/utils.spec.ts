import { TransformType } from '@dcl/ecs'
import { fromTransform, fromTransformConfig, getScale, mapToNumber, toTransform } from './utils'
import { TransformInput } from './types'

const getTransform = (): TransformType => ({
  position: { x: 8, y: 0, z: 8 },
  scale: { x: 1, y: 1, z: 1 },
  rotation: { x: 0, y: 0, z: 0, w: 1 }
})

describe('TransformInspector utils', () => {
  describe('when converting the TransformType into a TransformInput', () => {
    let transform: TransformType
    beforeEach(() => {
      transform = getTransform()
    })
    it('should convert position values to strings with two decimals', () => {
      const input = fromTransform(transform)
      expect(input.position.x).toBe('8.00')
      expect(input.position.y).toBe('0.00')
      expect(input.position.z).toBe('8.00')
    })
    it('should convert scale values to strings with two decimals', () => {
      const input = fromTransform(transform)
      expect(input.scale.x).toBe('1.00')
      expect(input.scale.y).toBe('1.00')
      expect(input.scale.z).toBe('1.00')
    })
    it('should convert rotation values from quaterion to euler angles, as strings with two decimals', () => {
      const input = fromTransform(transform)
      expect(input.rotation.x).toBe('0.00')
      expect(input.rotation.y).toBe('0.00')
      expect(input.rotation.z).toBe('0.00')
    })
  })
  describe('when converting the TransformInput into a TransformType', () => {
    let input: TransformInput
    beforeEach(() => {
      input = {
        position: { x: '8.00', y: '0.00', z: '8.00' },
        scale: { x: '1.00', y: '1.00', z: '1.00' },
        rotation: { x: '0.00', y: '0.00', z: '0.00' }
      }
    })
    it('should convert position string values into numbers', () => {
      const transform = toTransform()(input)
      expect(transform.position.x).toBe(8)
      expect(transform.position.y).toBe(0)
      expect(transform.position.z).toBe(8)
    })
    it('should convert scale string values into numbers', () => {
      const transform = toTransform()(input)
      expect(transform.scale.x).toBe(1)
      expect(transform.scale.y).toBe(1)
      expect(transform.scale.z).toBe(1)
    })
    it('should convert rotation euler angles into a quaternion', () => {
      const tranform = toTransform()(input)
      expect(tranform.rotation.x).toBe(0)
      expect(tranform.rotation.y).toBe(0)
      expect(tranform.rotation.z).toBe(0)
      expect(tranform.rotation.w).toBe(1)
    })
    it('should scale values porportionally', () => {
      const newValue = { ...input, scale: { x: '2.00', y: '1.00', z: '1.00' } }
      const config = { porportionalScaling: true }
      const transform = toTransform(getTransform(), config)(newValue)
      expect(transform.scale.x).toBe(2)
      expect(transform.scale.y).toBe(2)
      expect(transform.scale.z).toBe(2)
    })
  })
  describe('mapToNumber', () => {
    it('should map object values to numbers', () => {
      const input = {
        a: '123',
        b: '456',
        c: '789'
      }

      const result = mapToNumber(input)

      expect(result).toEqual({
        a: 123,
        b: 456,
        c: 789
      })
    })

    it('should handle empty object', () => {
      const input = {}

      const result = mapToNumber(input)

      expect(result).toEqual({})
    })

    it('should handle non-string values', () => {
      const input = {
        a: 123,
        b: true,
        c: null
      }

      const result = mapToNumber(input)

      expect(result).toEqual({
        a: 123,
        b: 1,
        c: 0
      })
    })

    it('should handle mixed string and non-string values', () => {
      const input = {
        a: '123',
        b: 456,
        c: '789',
        d: true
      }

      const result = mapToNumber(input)

      expect(result).toEqual({
        a: 123,
        b: 456,
        c: 789,
        d: 1
      })
    })
  })
  describe('getScale', () => {
    it('should return the same value when maintainPorportion is false', () => {
      const oldValue = { x: 1, y: 2, z: 3 }
      const value = { x: 4, y: 5, z: 6 }
      const mantainProportion = false

      const result = getScale(oldValue, value, mantainProportion)

      expect(result).toEqual(value)
    })

    it('should scale proportionally when x is changed', () => {
      const oldValue = { x: 2, y: 4, z: 6 }
      const value = { x: 4, y: 5, z: 6 }
      const mantainProportion = true

      const result = getScale(oldValue, value, mantainProportion)

      expect(result).toEqual({ x: 4, y: 10, z: 12 })
    })

    it('should scale proportionally when y is changed', () => {
      const oldValue = { x: 1, y: 2, z: 3 }
      const value = { x: 1, y: 4, z: 3 }
      const mantainProportion = true

      const result = getScale(oldValue, value, mantainProportion)

      expect(result).toEqual({ x: 2, y: 4, z: 6 })
    })

    it('should scale proportionally when z is changed', () => {
      const oldValue = { x: 2, y: 4, z: 6 }
      const value = { x: 2, y: 4, z: 3 }
      const mantainProportion = true

      const result = getScale(oldValue, value, mantainProportion)

      expect(result).toEqual({ x: 1, y: 2, z: 3 })
    })

    it('should return the same value when no dimensions are changed', () => {
      const oldValue = { x: 1, y: 2, z: 3 }
      const value = { x: 1, y: 2, z: 3 }
      const mantainProportion = true

      const result = getScale(oldValue, value, mantainProportion)

      expect(result).toEqual(value)
    })
  })
  describe('when converting the TransformConfig to TransformConfigInput', () => {
    it('should return an object with porportionalScaling set to true when passed true', () => {
      const input = {
        porportionalScaling: true
      }

      const result = fromTransformConfig(input)

      expect(result).toEqual({
        porportionalScaling: true
      })
    })

    it('should return an object with porportionalScaling set to false when passed false', () => {
      const input = {
        porportionalScaling: false
      }

      const result = fromTransformConfig(input)

      expect(result).toEqual({
        porportionalScaling: false
      })
    })

    it('should return an object with porportionalScaling set to false when not provided', () => {
      const input = {}

      const result = fromTransformConfig(input)

      expect(result).toEqual({
        porportionalScaling: false
      })
    })
  })
})
