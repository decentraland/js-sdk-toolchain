import { useCallback, useState } from 'react'

export function useArrayState<T>(initialArray: T[] = []) {
  const [array, setArray] = useState<T[]>([...initialArray])

  // Function to add an item to the array
  const addItem = useCallback(
    (item: T) => {
      setArray((prevArray) => [...prevArray, item])
    },
    [setArray]
  )

  // Function to modify an item in the array by index
  const modifyItem = useCallback(
    (index: number, newItem: T) => {
      setArray((prevArray) => {
        const newArray = [...prevArray]
        newArray[index] = newItem
        return newArray
      })
    },
    [setArray]
  )

  // Function to remove an item from the array by index
  const removeItem = useCallback(
    (index: number) => {
      setArray((prevArray) => {
        const newArray = [...prevArray]
        newArray.splice(index, 1)
        return newArray
      })
    },
    [setArray]
  )

  return [array, addItem, modifyItem, removeItem, setArray] as const
}
