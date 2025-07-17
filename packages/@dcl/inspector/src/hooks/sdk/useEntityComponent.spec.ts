import { renderHook, act } from '@testing-library/react'
import { Entity, CrdtMessageType } from '@dcl/ecs'
import { useEntityComponent } from './useEntityComponent'
import React from 'react'

let realUseContext: typeof React.useContext
let useContextMock: jest.Mock

const mockComponents = [
  { componentId: 1, componentName: 'Transform', has: jest.fn() },
  { componentId: 2, componentName: 'Mesh Renderer', has: jest.fn() },
  { componentId: 3, componentName: 'Visibility', has: jest.fn() }
]

const mockSdk = {
  engine: {
    componentsIter: jest.fn().mockReturnValue(mockComponents),
    getComponentOrNull: jest.fn((id: number) => mockComponents.find((comp) => comp.componentId === id)),
    RootEntity: 0 as Entity
  },
  operations: {
    addComponent: jest.fn(),
    removeComponent: jest.fn(),
    updateSelectedEntity: jest.fn(),
    dispatch: jest.fn().mockResolvedValue(void 0)
  },
  components: {
    Transform: { componentId: 1, componentName: 'Transform', has: jest.fn() },
    MeshRenderer: { componentId: 2, componentName: 'Mesh Renderer', has: jest.fn() },
    VisibilityComponent: { componentId: 3, componentName: 'Visibility', has: jest.fn() }
  }
}

jest.mock('./useChange', () => ({
  useChange: jest.fn().mockImplementation((callback: any) => {
    ;(global as any).triggerChange = callback
  })
}))

describe('useEntityComponent', () => {
  const testEntity = 123 as Entity

  beforeEach(() => {
    realUseContext = React.useContext
    useContextMock = React.useContext = jest.fn().mockReturnValue({ sdk: mockSdk }) as any
    jest.clearAllMocks()
    mockSdk.engine.componentsIter.mockReturnValue(mockComponents)
    mockSdk.engine.getComponentOrNull.mockImplementation((id: number) =>
      mockComponents.find((comp) => comp.componentId === id)
    )
  })

  afterEach(() => {
    React.useContext = realUseContext
    useContextMock.mockReset()
  })

  describe('getComponents', () => {
    it('should return components present on entity when missing=false', () => {
      mockComponents[0].has.mockReturnValue(true)
      mockComponents[1].has.mockReturnValue(true)
      mockComponents[2].has.mockReturnValue(false)

      const { result } = renderHook(() => useEntityComponent())

      const components = result.current.getComponents(testEntity, false)

      expect(components.size).toBe(2)
      expect(components.get(1)).toBe('Transform')
      expect(components.get(2)).toBe('Mesh Renderer')
      expect(components.has(3)).toBe(false)
    })

    it('should return missing components when missing=true', () => {
      mockComponents[0].has.mockReturnValue(true)
      mockComponents[1].has.mockReturnValue(false)
      mockComponents[2].has.mockReturnValue(false)

      const { result } = renderHook(() => useEntityComponent())

      const components = result.current.getComponents(testEntity, true)

      expect(components.size).toBe(2)
      expect(components.has(1)).toBe(false)
      expect(components.get(2)).toBe('Mesh Renderer')
      expect(components.get(3)).toBe('Visibility')
    })

    it('should return empty map when sdk is null', () => {
      useContextMock.mockReturnValueOnce({ sdk: null })

      const { result } = renderHook(() => useEntityComponent())

      const components = result.current.getComponents(testEntity)

      expect(components.size).toBe(0)
    })
  })

  describe('addComponent', () => {
    it('should add component when component is not already on entity', async () => {
      const componentId = 2
      const value = { someProperty: 'test' }

      mockSdk.engine.getComponentOrNull.mockReturnValue({
        componentId: 2,
        componentName: 'TestComponent',
        has: jest.fn().mockReturnValue(false)
      })

      const { result } = renderHook(() => useEntityComponent())

      await act(async () => {
        result.current.addComponent(testEntity, componentId, value)
      })

      expect(mockSdk.operations.addComponent).toHaveBeenCalledWith(testEntity, componentId, value)
      expect(mockSdk.operations.updateSelectedEntity).toHaveBeenCalledWith(testEntity)
      expect(mockSdk.operations.dispatch).toHaveBeenCalled()
    })

    it('should not add component when component already exists on entity', async () => {
      const componentId = 2

      mockSdk.engine.getComponentOrNull.mockReturnValue({
        componentId: 2,
        componentName: 'TestComponent',
        has: jest.fn().mockReturnValue(true)
      })

      const { result } = renderHook(() => useEntityComponent())

      await act(async () => {
        result.current.addComponent(testEntity, componentId)
      })

      expect(mockSdk.operations.addComponent).not.toHaveBeenCalled()
    })

    it('should not add component when sdk is null', async () => {
      useContextMock.mockReturnValueOnce({ sdk: null })

      const { result } = renderHook(() => useEntityComponent())

      await act(async () => {
        result.current.addComponent(testEntity, 2)
      })

      expect(mockSdk.operations.addComponent).not.toHaveBeenCalled()
    })
  })

  describe('removeComponent', () => {
    it('should remove component when sdk is available', async () => {
      const mockComponent = { componentId: 2, componentName: 'TestComponent' }

      const { result } = renderHook(() => useEntityComponent())

      await act(async () => {
        result.current.removeComponent(testEntity, mockComponent as any)
      })

      expect(mockSdk.operations.removeComponent).toHaveBeenCalledWith(testEntity, mockComponent)
      expect(mockSdk.operations.updateSelectedEntity).toHaveBeenCalledWith(testEntity)
      expect(mockSdk.operations.dispatch).toHaveBeenCalled()
    })

    it('should not remove component when sdk is null', async () => {
      useContextMock.mockReturnValueOnce({ sdk: null })

      const { result } = renderHook(() => useEntityComponent())

      await act(async () => {
        result.current.removeComponent(testEntity, {} as any)
      })

      expect(mockSdk.operations.removeComponent).not.toHaveBeenCalled()
    })
  })

  describe('getAvailableComponents', () => {
    it('should recalculate components when state is reset to null', () => {
      const { result } = renderHook(() => useEntityComponent())

      result.current.getAvailableComponents(testEntity)

      act(() => {
        ;(global as any).triggerChange({
          component: { componentId: 1 },
          operation: CrdtMessageType.PUT_COMPONENT
        })
      })

      result.current.getAvailableComponents(testEntity)

      expect(mockSdk.engine.componentsIter).toHaveBeenCalledTimes(2)
    })

    it('should return empty array when sdk is null', () => {
      useContextMock.mockReturnValueOnce({ sdk: null })

      const { result } = renderHook(() => useEntityComponent())
      const components = result.current.getAvailableComponents(testEntity)

      expect(components).toEqual([])
    })
  })

  describe('component state updates', () => {
    it('should reset available components state on PUT_COMPONENT', () => {
      const { result } = renderHook(() => useEntityComponent())

      result.current.getAvailableComponents(testEntity)
      expect(mockSdk.engine.componentsIter).toHaveBeenCalledTimes(1)

      act(() => {
        ;(global as any).triggerChange({
          component: { componentId: 1 },
          operation: CrdtMessageType.PUT_COMPONENT
        })
      })

      result.current.getAvailableComponents(testEntity)
      expect(mockSdk.engine.componentsIter).toHaveBeenCalledTimes(2)
    })

    it('should reset available components state on DELETE_COMPONENT', () => {
      const { result } = renderHook(() => useEntityComponent())

      result.current.getAvailableComponents(testEntity)
      expect(mockSdk.engine.componentsIter).toHaveBeenCalledTimes(1)

      act(() => {
        ;(global as any).triggerChange({
          component: { componentId: 1 },
          operation: CrdtMessageType.DELETE_COMPONENT
        })
      })

      result.current.getAvailableComponents(testEntity)
      expect(mockSdk.engine.componentsIter).toHaveBeenCalledTimes(2)
    })
  })
})
