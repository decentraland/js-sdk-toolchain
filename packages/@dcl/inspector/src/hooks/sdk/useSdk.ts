import React from 'react'
import { SdkContext } from '../../components/SdkProvider'
import { SdkContextValue } from '../../lib/sdk/context'

/**
 * This can be used to get the SDK context, which can be uninitialized, or as an effect, to be run once the SDK context is available
 * @param cb
 * @param deps
 * @returns
 */
export const useSdk = (cb?: (sdk: SdkContextValue) => (() => void) | void, deps: React.DependencyList = []) => {
  const { sdk } = React.useContext(SdkContext)
  React.useEffect(() => {
    let unsubscribe: (() => void) | void
    if (sdk && cb) {
      unsubscribe = cb(sdk)
    }
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [sdk, ...deps])
  return sdk
}
