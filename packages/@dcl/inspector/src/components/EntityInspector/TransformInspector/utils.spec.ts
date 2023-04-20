import { TransformType } from '@dcl/ecs'
import { fromTransform, toTransform } from './utils'
import { TransformInput } from './types'

describe('TransformInspector utils', () => {
  describe('when converting the TransformType into a TransformInput', () => {
    let transform: TransformType
    beforeEach(() => {
      transform = {
        position: { x: 8, y: 0, z: 8 },
        scale: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 }
      }
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
      const transform = toTransform(input)
      expect(transform.position.x).toBe(8)
      expect(transform.position.y).toBe(0)
      expect(transform.position.z).toBe(8)
    })
    it('should convert scale string values into numbers', () => {
      const transform = toTransform(input)
      expect(transform.scale.x).toBe(1)
      expect(transform.scale.y).toBe(1)
      expect(transform.scale.z).toBe(1)
    })
    it('should convert rotation euler angles into a quaternion', () => {
      const tranform = toTransform(input)
      expect(tranform.rotation.x).toBe(0)
      expect(tranform.rotation.y).toBe(0)
      expect(tranform.rotation.z).toBe(0)
      expect(tranform.rotation.w).toBe(1)
    })
  })
})
