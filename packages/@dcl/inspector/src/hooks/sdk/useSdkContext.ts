import { useCallback, useEffect, useState } from 'react'
import { createSdkContext, SdkContextValue } from '../../lib/sdk/context'
import { useCatalog } from '../catalog/useCatalog'

/**
 *
 * @returns This hook is only meant to be used by the SdkProvider, use useSdk instead
 */
export const useSdkContext = () => {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [sdk, setSdk] = useState<SdkContextValue | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [catalog] = useCatalog()

  useEffect(() => {
    if (!catalog || !canvas || sdk || isLoading) return
    setIsLoading(true)
    createSdkContext(canvas, catalog)
      .then((ctx) => {
        setSdk(ctx)
      })
      .catch((e) => {
        console.error(`createSdkContext failed: `, e)
        setError(e)
      })
      .finally(() => setIsLoading(false))
  }, [catalog, canvas, sdk, isLoading])

  useEffect(() => {
    const updateInterval = setInterval(() => {
      void sdk?.engine.update(0)
    }, 16)
    return () => {
      clearInterval(updateInterval)
    }
  }, [sdk])

  const renderer = useCallback(
    (ref: React.RefObject<HTMLCanvasElement>) => {
      if (!canvas && ref.current) {
        setCanvas(ref.current)
      }
      return ref
    },
    [canvas]
  )

  return { sdk, error, renderer }
}
