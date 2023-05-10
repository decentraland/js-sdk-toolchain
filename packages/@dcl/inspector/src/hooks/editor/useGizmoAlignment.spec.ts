import { SdkContextValue } from '../../lib/sdk/context'
import { useGizmoAlignment } from './useGizmoAlignment'

// useSdk mock
import { useSdk } from '../sdk/useSdk'
jest.mock('../sdk/useSdk')
const useSdkMock = useSdk as jest.MockedFunction<typeof useSdk>
const sdkMock = { scene: {} } as SdkContextValue
useSdkMock.mockImplementation((cb) => {
  cb && cb(sdkMock)
  return sdkMock
})

// gizmoManager mock
import { getGizmoManager } from '../../lib/babylon/decentraland/gizmo-manager'
import mitt from 'mitt'
import { renderHook } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
jest.mock('../../lib/babylon/decentraland/gizmo-manager')
const getGizmoManagerMock = getGizmoManager as jest.MockedFn<typeof getGizmoManager>
const gizmoManagerEvents = mitt()
const gizmoManagerMock = {
  isPositionGizmoWorldAligned: jest.fn().mockReturnValue(true),
  isRotationGizmoWorldAligned: jest.fn().mockReturnValue(true),
  setPositionGizmoWorldAligned: jest.fn(),
  setRotationGizmoWorldAligned: jest.fn(),
  onChange: jest.fn().mockImplementation((cb) => gizmoManagerEvents.on('*', cb))
}
getGizmoManagerMock.mockReturnValue(gizmoManagerMock as unknown as ReturnType<typeof getGizmoManager>)

describe('useGizmoAlignment', () => {
  afterEach(() => {
    useSdkMock.mockClear()
    getGizmoManagerMock.mockClear()
    gizmoManagerMock.isPositionGizmoWorldAligned.mockClear()
    gizmoManagerMock.isRotationGizmoWorldAligned.mockClear()
    gizmoManagerMock.setPositionGizmoWorldAligned.mockClear()
    gizmoManagerMock.setRotationGizmoWorldAligned.mockClear()
    gizmoManagerMock.onChange.mockClear()
    gizmoManagerEvents.all.clear()
  })
  describe('When the hook is mounted ', () => {
    it('should sync the state with the gizmo manager', () => {
      const { result } = renderHook(() => useGizmoAlignment())
      const { isPositionGizmoWorldAligned, isRotationGizmoWorldAligned } = result.current
      expect(isPositionGizmoWorldAligned).toBe(true)
      expect(isRotationGizmoWorldAligned).toBe(true)
      expect(gizmoManagerMock.isPositionGizmoWorldAligned).toHaveBeenCalled()
      expect(gizmoManagerMock.isRotationGizmoWorldAligned).toHaveBeenCalled()
    })
    it('should add a listener for the onChange event of the gizmoManager', () => {
      renderHook(() => useGizmoAlignment())
      expect(gizmoManagerMock.onChange).toHaveBeenCalled()
    })
    it('should not update the renderer', () => {
      renderHook(() => useGizmoAlignment())
      expect(gizmoManagerMock.setPositionGizmoWorldAligned).not.toHaveBeenCalled()
      expect(gizmoManagerMock.setRotationGizmoWorldAligned).not.toHaveBeenCalled()
    })
  })
  describe('When the hook state is changed ', () => {
    it('should update the renderer', () => {
      const { result } = renderHook(() => useGizmoAlignment())
      const { setPositionGizmoWorldAligned, setRotationGizmoWorldAligned } = result.current
      expect(result.current.isPositionGizmoWorldAligned).toBe(true)
      expect(result.current.isRotationGizmoWorldAligned).toBe(true)
      gizmoManagerMock.isPositionGizmoWorldAligned.mockReturnValueOnce(false)
      gizmoManagerMock.isRotationGizmoWorldAligned.mockReturnValueOnce(false)
      act(() => {
        setPositionGizmoWorldAligned(false)
        setRotationGizmoWorldAligned(false)
      })
      expect(result.current.isPositionGizmoWorldAligned).toBe(false)
      expect(result.current.isRotationGizmoWorldAligned).toBe(false)
      expect(gizmoManagerMock.setPositionGizmoWorldAligned).toHaveBeenCalledWith(false)
      expect(gizmoManagerMock.setRotationGizmoWorldAligned).toHaveBeenCalledWith(false)
    })
  })
  describe('When a change happens in the renderer', () => {
    it('should update the hook state', () => {
      renderHook(() => useGizmoAlignment())
      gizmoManagerMock.isPositionGizmoWorldAligned.mockClear()
      gizmoManagerMock.isRotationGizmoWorldAligned.mockClear()
      gizmoManagerEvents.emit('*')
      expect(gizmoManagerMock.isPositionGizmoWorldAligned).toHaveBeenCalled()
      expect(gizmoManagerMock.isRotationGizmoWorldAligned).toHaveBeenCalled()
    })
  })
})
