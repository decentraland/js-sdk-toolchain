import { SdkContextValue } from '../../lib/sdk/context'
import { CoreComponents } from '../../lib/sdk/components'
import { useGizmoAlignment } from './useGizmoAlignment'

// gizmoManager mock
import { createGizmoManager } from '../../lib/babylon/decentraland/gizmo-manager'
import mitt from 'mitt'
import { renderHook } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
jest.mock('../../lib/babylon/decentraland/gizmo-manager')
const createGizmoManagerMock = createGizmoManager as jest.MockedFn<typeof createGizmoManager>
const gizmoManagerEvents = mitt()
const mockEntity = 0 as Entity
const gizmoManagerMock = {
  getEntity: jest.fn().mockReturnValue({ entityId: mockEntity } as EcsEntity),
  isPositionGizmoWorldAligned: jest.fn().mockReturnValue(true),
  isRotationGizmoWorldAligned: jest.fn().mockReturnValue(true),
  isRotationGizmoAlignmentDisabled: jest.fn().mockReturnValue(false),
  isPositionGizmoAlignmentDisabled: jest.fn().mockReturnValue(false),
  setPositionGizmoWorldAligned: jest.fn(),
  setRotationGizmoWorldAligned: jest.fn(),
  fixRotationGizmoAlignment: jest.fn(),
  fixPositionGizmoAlignment: jest.fn(),
  onChange: jest.fn().mockImplementation((cb) => gizmoManagerEvents.on('*', cb))
}
createGizmoManagerMock.mockReturnValue(gizmoManagerMock as unknown as ReturnType<typeof createGizmoManager>)

// useSdk mock
import { useSdk } from '../sdk/useSdk'
jest.mock('../sdk/useSdk')
const useSdkMock = useSdk as jest.MockedFunction<typeof useSdk>
const sdkMock = {
  scene: {},
  components: { Transform: { componentId: CoreComponents.TRANSFORM } },
  gizmos: gizmoManagerMock
} as unknown as SdkContextValue
useSdkMock.mockImplementation((cb) => {
  cb && cb(sdkMock)
  return sdkMock
})

// useChange mock
import { useChange } from '../sdk/useChange'
import { CrdtMessageType, Entity } from '@dcl/ecs'
import { EcsEntity } from '../../lib/babylon/decentraland/EcsEntity'
jest.mock('../sdk/useChange')
const engineEvents = mitt()
const useChangeMock = useChange as jest.MockedFunction<typeof useChange>
const mockEvent = {
  entity: mockEntity,
  component: sdkMock.components.Transform,
  operation: CrdtMessageType.PUT_COMPONENT,
  value: {}
}
useChangeMock.mockImplementation((cb) => {
  cb && engineEvents.on('*', () => cb(mockEvent, sdkMock))
})

describe('useGizmoAlignment', () => {
  afterEach(() => {
    useSdkMock.mockClear()
    createGizmoManagerMock.mockClear()
    gizmoManagerMock.isPositionGizmoWorldAligned.mockClear()
    gizmoManagerMock.isRotationGizmoWorldAligned.mockClear()
    gizmoManagerMock.setPositionGizmoWorldAligned.mockClear()
    gizmoManagerMock.setRotationGizmoWorldAligned.mockClear()
    gizmoManagerMock.onChange.mockClear()
    gizmoManagerEvents.all.clear()
    engineEvents.all.clear()
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
      gizmoManagerMock.isPositionGizmoWorldAligned.mockReturnValue(true)
      gizmoManagerMock.isRotationGizmoWorldAligned.mockReturnValue(true)
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
      gizmoManagerMock.isRotationGizmoAlignmentDisabled.mockReset()
      gizmoManagerMock.isRotationGizmoAlignmentDisabled.mockReturnValue(true)
      gizmoManagerEvents.emit('*')
      expect(gizmoManagerMock.isPositionGizmoWorldAligned).toHaveBeenCalled()
      expect(gizmoManagerMock.isRotationGizmoWorldAligned).toHaveBeenCalled()
      expect(gizmoManagerMock.isRotationGizmoAlignmentDisabled).toHaveBeenCalled()
    })
  })
  describe('When a change happens in the engine', () => {
    it('should update the renderer', () => {
      engineEvents.all.clear()
      renderHook(() => useGizmoAlignment())
      expect(gizmoManagerMock.fixRotationGizmoAlignment).not.toHaveBeenCalled()
      engineEvents.emit('*')
      expect(gizmoManagerMock.fixRotationGizmoAlignment).toHaveBeenCalledWith(mockEvent.value)
    })
  })
})
