import { Quaternion, Vector3 } from '@babylonjs/core'
import {
  snapManager,
  snapPosition,
  snapQuaternion,
  snapRotation,
  snapScale,
  snapValue,
  snapVector
} from './snap-manager'

const toRad = (deg: number) => deg * (Math.PI / 180)
const toDeg = (rad: number) => Math.round(rad * (180 / Math.PI))

describe('snapManager', () => {
  beforeEach(() => {
    snapManager.setPositionSnap(0.25)
    snapManager.setRotationSnap(toRad(15))
    snapManager.setScaleSnap(0.1)
    snapManager.setEnabled(true)
  })

  describe('When getting the snap distance values', () => {
    it('should get the position snap', () => {
      expect(snapManager.getPositionSnap()).toBe(0.25)
    })
    it('should get the rotation snap', () => {
      expect(snapManager.getRotationSnap()).toBe(toRad(15))
    })
    it('should get the scale snap', () => {
      expect(snapManager.getScaleSnap()).toBe(0.1)
    })
  })
  describe('When setting the snap distance values', () => {
    it('should get the position snap', () => {
      snapManager.setPositionSnap(2)
      expect(snapManager.getPositionSnap()).toBe(2)
    })
    it('should get the rotation snap', () => {
      snapManager.setRotationSnap(toRad(30))
      expect(snapManager.getRotationSnap()).toBe(toRad(30))
    })
    it('should get the scale snap', () => {
      snapManager.setScaleSnap(0.5)
      expect(snapManager.getScaleSnap()).toBe(0.5)
    })
  })

  describe('When toggling the snap manager', () => {
    it('should set the snap manager to enabled', () => {
      snapManager.setEnabled(true)
      expect(snapManager.isEnabled()).toBe(true)
    })
    it('should set the snap manager to disabled', () => {
      snapManager.setEnabled(false)
      expect(snapManager.isEnabled()).toBe(false)
    })
    it('should toggle the snap manager', () => {
      snapManager.toggle()
      expect(snapManager.isEnabled()).toBe(false)
      snapManager.toggle()
      expect(snapManager.isEnabled()).toBe(true)
    })
  })

  describe('When listeing to a change', () => {
    let handler: jest.Mock
    let unsubscribe: () => void
    beforeEach(() => {
      handler = jest.fn()
      unsubscribe = snapManager.onChange(handler)
    })
    afterEach(() => {
      unsubscribe()
      handler.mockReset()
    })
    it('should call the handler when the position snap is changed', () => {
      snapManager.setPositionSnap(2)
      expect(handler).toBeCalledWith(
        expect.objectContaining({
          positionSnap: 2
        })
      )
    })
    it('should call the handler when the rotation snap is changed', () => {
      snapManager.setRotationSnap(toRad(30))
      expect(handler).toBeCalledWith(
        expect.objectContaining({
          rotationSnap: toRad(30)
        })
      )
    })
    it('should call the handler when the scale snap is changed', () => {
      snapManager.setScaleSnap(0.1)
      expect(handler).toBeCalledWith(
        expect.objectContaining({
          scaleSnap: 0.1
        })
      )
    })
    it('should call the handler when the snap enabled/disabled', () => {
      snapManager.setEnabled(false)
      expect(handler).toBeCalledWith(
        expect.objectContaining({
          enabled: false
        })
      )
      snapManager.setEnabled(true)
      expect(handler).toBeCalledWith(
        expect.objectContaining({
          enabled: true
        })
      )
    })
    it('should stop calling the handler afer unsubscribing', () => {
      unsubscribe()
      snapManager.setEnabled(false)
      expect(handler).not.toHaveBeenCalled()
    })
  })
  describe('When snapping a value', () => {
    it('should round it to the closest value according to the snap distance provided', () => {
      expect(snapValue(5.3, 0.25)).toBe(5.25)
    })
    it('should return the same value if the snap distance is less or equal to zero', () => {
      expect(snapValue(5.3, 0)).toBe(5.3)
      expect(snapValue(5.3, -1)).toBe(5.3)
    })
  })
  describe('When snapping a Vector3', () => {
    it('should snap the value of each axis', () => {
      const vector = new Vector3(5.3, 7.1, 6.0)
      const snapped = snapVector(vector, 0.25)
      expect(snapped.x).toBe(5.25)
      expect(snapped.y).toBe(7)
      expect(snapped.z).toBe(6)
    })
  })
  describe('When snapping a Quaternion', () => {
    it('should snap the value of each axis as if they were euler angles', () => {
      const quaterion = Quaternion.FromEulerAngles(toRad(70), toRad(95), toRad(16))
      const snapped = snapQuaternion(quaterion, toRad(15))
      const angles = snapped.toEulerAngles()
      expect(toDeg(angles.x)).toBe(75)
      expect(toDeg(angles.y)).toBe(90)
      expect(toDeg(angles.z)).toBe(15)
    })
  })
  describe('When snapping a position', () => {
    describe('and the snap manager is disabled', () => {
      it('should return the same position', () => {
        snapManager.setEnabled(false)
        const position = new Vector3(5.3, 7.1, 6.0)
        const snapped = snapPosition(position)
        expect(snapped).toBe(position)
      })
    })
    describe('and the snap manager is enabled', () => {
      it('should snap the position', () => {
        const position = new Vector3(5.3, 7.1, 6.0)
        const snapped = snapPosition(position)
        expect(snapped.x).toBe(5.25)
        expect(snapped.y).toBe(7)
        expect(snapped.z).toBe(6)
      })
    })
  })
  describe('When snapping a rotation', () => {
    describe('and the snap manager is disabled', () => {
      it('should return the same rotation', () => {
        snapManager.setEnabled(false)
        const rotation = Quaternion.FromEulerAngles(toRad(70), toRad(95), toRad(16))
        const snapped = snapRotation(rotation)
        expect(snapped).toBe(rotation)
      })
    })
    describe('and the snap manager is enabled', () => {
      it('should snap the rotation', () => {
        const rotation = Quaternion.FromEulerAngles(toRad(70), toRad(95), toRad(16))
        const snapped = snapRotation(rotation)
        const angles = snapped.toEulerAngles()
        expect(toDeg(angles.x)).toBe(75)
        expect(toDeg(angles.y)).toBe(90)
        expect(toDeg(angles.z)).toBe(15)
      })
    })
  })
  describe('When snapping a scale', () => {
    describe('and the snap manager is disabled', () => {
      it('should return the same scale', () => {
        snapManager.setEnabled(false)
        const scale = new Vector3(1.35, 1.12, 1)
        const snapped = snapScale(scale)
        expect(snapped).toBe(scale)
      })
    })
    describe('and the snap manager is enabled', () => {
      it('should snap the scale', () => {
        const scale = new Vector3(1.25, 1.12, 1)
        const snapped = snapScale(scale)
        expect(snapped.x).toBe(1.3)
        expect(snapped.y).toBe(1.1)
        expect(snapped.z).toBe(1)
      })
    })
  })
})
