import { useEffect } from 'react'
import { SdkContextEvents } from '../../lib/sdk/engine'
import { useSdk } from './useSdk'

/**
 * This can be used to register a callback for every time there is a change in the engine
 * @param callback
 */
export const useChange = (callback: (event: SdkContextEvents['change']) => void) => {
  const sdk = useSdk()
  useEffect(() => {
    function handleChange(event: SdkContextEvents['change']) {
      callback(event)
    }
    if (sdk) {
      sdk.events.on('change', handleChange)
    }
    return () => {
      if (sdk) {
        sdk.events.off('change', handleChange)
      }
    }
  }, [sdk])
}
