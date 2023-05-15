import mitt from 'mitt'
import { useState } from 'react'

import { useSdk } from '../sdk/useSdk'

type SaveEvent = { change: boolean }
export const saveEvent = mitt<SaveEvent>()

/* istanbul ignore next */
export const useSave = () => {
  const [isDirty, setIsDirty] = useState(false)
  useSdk(() => {
    saveEvent.on('change', (value: boolean) => setIsDirty(value))
  })

  return [isDirty]
}
