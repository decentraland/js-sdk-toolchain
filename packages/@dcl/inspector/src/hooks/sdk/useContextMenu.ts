import { useCallback } from 'react'
import { ItemParams } from 'react-contexify'

/**
 * Used to get the functions to work with a Context Menu
 * @returns
 */
export const useContextMenu = () => {
  const handleAction = useCallback(
    (cb: (...params: any) => void, ...params: any) =>
      ({ id, event }: ItemParams) => {
        event.preventDefault()
        event.stopPropagation()
        cb(id, ...params)
      },
    []
  )

  return { handleAction }
}
