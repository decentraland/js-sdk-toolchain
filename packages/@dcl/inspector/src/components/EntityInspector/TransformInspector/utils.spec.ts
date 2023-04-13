import { TransformType } from '@dcl/ecs'
import { fromTransform } from './utils'

describe('TransformInspector utils', () => {
  let transform: TransformType

  beforeEach(() => {
    transform = {
      position: { x: 8, y: 0, z: 8 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    }
  })
  describe('when converting the TransformType into a TransformInput', () => {
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
})
