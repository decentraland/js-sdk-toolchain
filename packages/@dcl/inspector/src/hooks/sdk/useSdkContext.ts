import { useCallback, useEffect, useState } from 'react'
import { createSdkContext, SdkContextValue } from '../../lib/sdk/context'
import { catalog } from '../../lib/logic/catalog'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { connect as connectDataLayer } from '../../redux/data-layer'
import { addEngines } from '../../redux/sdk'
import { selectInspectorPreferences } from '../../redux/app'

/**
 *
 * @returns This hook is only meant to be used by the SdkProvider, use useSdk instead
 */
export const useSdkContext = () => {
  const preferences = useAppSelector(selectInspectorPreferences)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [sdk, setSdk] = useState<SdkContextValue | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const dispatch = useAppDispatch()
  let sdkInitialized = false

  useEffect(() => {
    dispatch(connectDataLayer())
  }, [dispatch])

  useEffect(() => {
    if (!catalog.length || !canvas || !preferences || sdkInitialized || !!sdk) return
    sdkInitialized = true
    createSdkContext(canvas, catalog, preferences)
      .then((ctx) => {
        setSdk(ctx)
        dispatch(addEngines({ inspector: ctx.engine, babylon: ctx.sceneContext.engine }))
      })
      .catch((e) => {
        console.error(`createSdkContext failed: `, e)
        setError(e)
      })
  }, [catalog, preferences, canvas])

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
