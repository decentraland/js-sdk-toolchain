import { act, renderHook } from '@testing-library/react'
import { useWindowSize } from './useWindowSize'

const originalWidth = global.innerWidth
const originalHeight = global.innerHeight

describe('useWindowSize', () => {
  describe('When the hook is rendered', () => {
    beforeEach(() => {
      global.innerWidth = 1024
      global.innerHeight = 1024
    })
    afterEach(() => {
      global.innerWidth = originalWidth
      global.innerHeight = originalHeight
    })
    it('should return the width and height of the window', () => {
      const { result } = renderHook(() => useWindowSize())
      const { width, height } = result.current
      expect(width).toBe(1024)
      expect(height).toBe(1024)
    })
    describe('and the window is resized', () => {
      it('should return the new size of the window', () => {
        const { result } = renderHook(() => useWindowSize())
        const { width, height } = result.current
        expect(width).toBe(1024)
        expect(height).toBe(1024)
        act(() => {
          global.innerWidth = 800
          global.innerHeight = 600
          global.dispatchEvent(new Event('resize'))
        })
        const { width: newWidth, height: newHeight } = result.current
        expect(newWidth).toBe(800)
        expect(newHeight).toBe(600)
      })
    })
  })
})
