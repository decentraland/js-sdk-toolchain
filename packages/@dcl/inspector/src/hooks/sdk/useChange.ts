import { useEffect } from 'react'
import { SdkContextEvents, SdkContextValue } from '../../lib/sdk/context'
import { useSdk } from './useSdk'

/**
 * This can be used to register a callback for every time there is a change in the engine
 * @param callback
 */
export const useChange = (
  callback: (event: SdkContextEvents['change'], sdk: SdkContextValue) => void,
  deps: React.DependencyList = []
) => {
  const sdk = useSdk()
  useEffect(() => {
    function handleChange(event: SdkContextEvents['change']) {
      if (sdk) {
        callback(event, sdk)
      }
    }
    if (sdk) {
      sdk.events.on('change', handleChange)
    }
    return () => {
      if (sdk) {
        sdk.events.off('change', handleChange)
      }
    }
  }, [sdk, ...deps])
}
