import mitt from 'mitt'
import { useCallback, useState } from 'react'

import { useSdk } from '../sdk/useSdk'

type SaveEvent = { change: boolean }
export const saveEvent = mitt<SaveEvent>()

export const useSave = (): [() => Promise<void>, boolean] => {
  const sdk = useSdk()
  const [isDirty, setIsDirty] = useState(false)

  const saveFn = useCallback(async () => {
    await sdk?.dataLayer.save({})
    setIsDirty(false)
  }, [sdk])

  saveEvent.on('change', (value: boolean) => setIsDirty(value))

  return [saveFn, isDirty]
}
