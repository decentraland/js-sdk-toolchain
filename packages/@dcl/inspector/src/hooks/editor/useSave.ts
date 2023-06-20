import mitt from 'mitt'
import { useCallback, useState } from 'react'

import { useAppSelector } from '../../redux/hooks'
import { getDataLayer } from '../../redux/data-layer'
import { useSdk } from '../sdk/useSdk'

type SaveEvent = { change: boolean }
export const saveEvent = mitt<SaveEvent>()

export const useSave = (): [() => Promise<void>, boolean] => {
  const dataLayer = useAppSelector(getDataLayer)
  const sdk = useSdk()
  const [isDirty, setIsDirty] = useState(false)

  const saveFn = useCallback(async () => {
    await dataLayer?.save({})
    setIsDirty(false)
  }, [dataLayer])

  saveEvent.on('change', (value: boolean) => {
    if (value && !sdk?.preferences.data.autosaveEnabled) setIsDirty(true)
    else setIsDirty(false)
  })

  return [saveFn, isDirty]
}
