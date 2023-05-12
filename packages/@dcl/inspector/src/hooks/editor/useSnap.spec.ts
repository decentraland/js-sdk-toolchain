import { renderHook, act } from '@testing-library/react/'
import { useSnapState, useSnapToggle } from './useSnap'
import { GizmoType } from '../../lib/utils/gizmo'
import { snapManager } from '../../lib/babylon/decentraland/snap-manager'

describe('useSnapState', () => {
  describe('When getting the snap value', () => {
    it('should read the snap position value', () => {
      const { result } = renderHook(() => useSnapState(GizmoType.POSITION))
      const [snap] = result.current
      expect(snap).toBe('0.25')
    })
    it('should read the snap rotation value', () => {
      const { result } = renderHook(() => useSnapState(GizmoType.ROTATION))
      const [snap] = result.current
      expect(snap).toBe('15')
    })
    it('should read the snap scale value', () => {
      const { result } = renderHook(() => useSnapState(GizmoType.SCALE))
      const [snap] = result.current
      expect(snap).toBe('0.1')
    })
  })
  describe('When setting the snap value using the hook', () => {
    beforeEach(() => {
      snapManager.setPositionSnap(0.25)
    })
    it('should update the snap value from the hook', () => {
      // translate
      const { result: position } = renderHook(() => useSnapState(GizmoType.POSITION))
      const [_positionSnap, setPositionSnap] = position.current
      act(() => setPositionSnap('0.5'))
      const [positionSnap] = position.current
      expect(positionSnap).toBe('0.5')
      // translate
      const { result: rotation } = renderHook(() => useSnapState(GizmoType.ROTATION))
      const [_rotationSnap, setRotationSnap] = rotation.current
      act(() => setRotationSnap('30'))
      const [rotationSnap] = rotation.current
      expect(rotationSnap).toBe('30')
      // scale
      const { result: scale } = renderHook(() => useSnapState(GizmoType.SCALE))
      const [_scaleSnap, setScaleSnap] = scale.current
      act(() => setScaleSnap('0.5'))
      const [scaleSnap] = scale.current
      expect(scaleSnap).toBe('0.5')
    })
    it('should update the snap value in the snap manager', () => {
      const { result } = renderHook(() => useSnapState(GizmoType.POSITION))
      const [_, setSnap] = result.current
      act(() => setSnap('0.5'))
      expect(snapManager.getPositionSnap()).toBe(0.5)
    })
  })

  describe('When setting the snap value using the snap manager', () => {
    beforeEach(() => {
      snapManager.setPositionSnap(0.25)
    })
    it('should update the snap value from the hook if the value is different', () => {
      const { result } = renderHook(() => useSnapState(GizmoType.POSITION))
      const [snap1] = result.current
      expect(snap1).toBe('0.25')
      act(() => snapManager.setPositionSnap(0.5))
      const [snap2] = result.current
      expect(snap2).toBe('0.5')
    })
    it('should not update the snap value from the hook if the value is the same', () => {
      const { result } = renderHook(() => useSnapState(GizmoType.POSITION))
      const [snap1] = result.current
      expect(snap1).toBe('0.25')
      act(() => snapManager.setPositionSnap(0.25))
      const [snap2] = result.current
      expect(snap2).toBe(snap1)
    })
  })
})

describe('useSnapToggle', () => {
  beforeEach(() => {
    snapManager.setEnabled(true)
  })
  describe('When the snap manager is enabled', () => {
    it('should return isEnabled as true', () => {
      const { result } = renderHook(() => useSnapToggle())
      const { isEnabled } = result.current
      expect(isEnabled).toBe(true)
    })
    describe('and the snap manager is then disabled', () => {
      beforeEach(() => {
        snapManager.setEnabled(false)
      })
      it('should return isEnabled as false', () => {
        const { result } = renderHook(() => useSnapToggle())
        const { isEnabled } = result.current
        expect(isEnabled).toBe(false)
      })
    })
  })
  describe('When disabling the snap manager using the hook', () => {
    it('should update the value returned by the hook', () => {
      const { result } = renderHook(() => useSnapToggle())
      const { isEnabled: isEnabledBefore, setEnabled } = result.current
      expect(isEnabledBefore).toBe(true)
      act(() => setEnabled(false))
      const { isEnabled: isEnabledAfter } = result.current
      expect(isEnabledAfter).toBe(false)
    })
    it('should update the value in the snap manager', () => {
      const { result } = renderHook(() => useSnapToggle())
      const { isEnabled, setEnabled } = result.current
      expect(isEnabled).toBe(true)
      act(() => setEnabled(false))
      expect(snapManager.isEnabled()).toBe(false)
    })
  })
  describe('When disabling the snap manager from the snap manager itself', () => {
    it('should update the value returned by the hook', () => {
      const { result } = renderHook(() => useSnapToggle())
      const { isEnabled: isEnabledBefore } = result.current
      expect(isEnabledBefore).toBe(true)
      act(() => snapManager.setEnabled(false))
      const { isEnabled: isEnabledAfter } = result.current
      expect(isEnabledAfter).toBe(false)
    })
  })
})
