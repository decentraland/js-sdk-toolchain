import { useCallback, useEffect, useState } from 'react'
import { createSdkContext, SdkContextValue } from '../../lib/sdk/context'
import { useCatalog } from '../catalog/useCatalog'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { getDataLayer, connect as connectDataLayer } from '../../redux/data-layer'

/**
 *
 * @returns This hook is only meant to be used by the SdkProvider, use useSdk instead
 */
export const useSdkContext = () => {
  const dataLayer = useAppSelector(getDataLayer)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [sdk, setSdk] = useState<SdkContextValue | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [catalog] = useCatalog()
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(connectDataLayer())
  }, [dispatch])

  useEffect(() => {
    if (!catalog || !canvas || sdk || isLoading || !dataLayer) return
    setIsLoading(true)
    createSdkContext(dataLayer, canvas, catalog)
      .then((ctx) => {
        setSdk(ctx)
      })
      .catch((e) => {
        console.error(`createSdkContext failed: `, e)
        setError(e)
      })
      .finally(() => setIsLoading(false))
  }, [catalog, canvas, sdk, isLoading])

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
