import { useState, useEffect, RefObject } from 'react'

// Define general type for useContainerSize hook, which includes width and height
interface Size {
  width: number | undefined
  height: number | undefined
}

export function useContainerSize(container: RefObject<any>): Size {
  const [containerSize, setContainerSize] = useState<Size>({
    width: undefined,
    height: undefined
  })

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setContainerSize({ width, height })
      }
    })

    if (container.current) {
      resizeObserver.observe(container.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return containerSize
}
