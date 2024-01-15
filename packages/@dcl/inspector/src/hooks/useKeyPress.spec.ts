import { act, renderHook } from '@testing-library/react'
import { useKeyPress } from './useKeyPress'

describe('useKeyPress', () => {
  it('calls the callback when a key is pressed', () => {
    const callback = jest.fn()
    renderHook(() => useKeyPress(['Enter'], callback))

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      document.dispatchEvent(event)
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('does not call the callback when a different key is pressed', () => {
    const callback = jest.fn()
    renderHook(() => useKeyPress(['Enter'], callback))

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('calls the callback when any of the specified keys are pressed', () => {
    const callback = jest.fn()
    renderHook(() => useKeyPress(['Enter', 'Space'], callback))

    act(() => {
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      document.dispatchEvent(enterEvent)

      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' })
      document.dispatchEvent(spaceEvent)
    })

    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('does not call the callback when no key is pressed', () => {
    const callback = jest.fn()
    renderHook(() => useKeyPress(['Enter'], callback))

    expect(callback).not.toHaveBeenCalled()
  })
})
