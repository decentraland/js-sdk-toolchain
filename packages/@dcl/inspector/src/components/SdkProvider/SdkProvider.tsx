import React, { Children, useMemo } from 'react'
import { useSdkContext } from '../../hooks/sdk/useSdkContext'
import { SdkContextValue } from '../../lib/sdk/context'

/**
 * This is used internally to make the SDK context available easily on the useSdk hook
 */
export const SdkContext = React.createContext<{
  sdk: SdkContextValue | null
  renderer: (ref: React.RefObject<HTMLCanvasElement>) => React.RefObject<HTMLCanvasElement>
}>({ sdk: null, renderer: (ref) => ref })

export const SdkProvider: React.FC<{ children: React.ReactNode }> = (props) => {
  const { sdk, renderer } = useSdkContext()
  const value = useMemo(() => ({ sdk, renderer }), [sdk, renderer])
  return <SdkContext.Provider value={value}>{Children.only(props.children)}</SdkContext.Provider>
}
