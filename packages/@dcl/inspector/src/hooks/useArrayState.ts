import { useCallback, useEffect, useState } from 'react'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'

export function useArrayState<T>(initialArray: T[] = []) {
  const [array, setArray] = useState<T[]>([...initialArray])

  useEffect(() => {
    if (!recursiveCheck(initialArray, array, 2)) return
    setArray([...initialArray])
  }, [initialArray])

  // Function to add an item to the array
  const addItem = useCallback(
    (item: T, callback?: (updatedArray: T[]) => void) => {
      setArray((prevArray) => {
        const newArray = [...prevArray, item]
        if (callback) {
          setTimeout(() => callback(newArray), 0)
        }
        return newArray
      })
    },
    [setArray]
  )

  // Function to modify an item in the array by index
  const modifyItem = useCallback(
    (index: number, newItem: T, callback?: (updatedArray: T[]) => void) => {
      setArray((prevArray) => {
        const newArray = [...prevArray]
        newArray[index] = newItem
        if (callback) {
          // Use setTimeout to ensure the callback runs after the state update
          setTimeout(() => callback(newArray), 0)
        }
        return newArray
      })
    },
    [setArray]
  )

  // Function to remove an item from the array by index
  const removeItem = useCallback(
    (index: number, callback?: (updatedArray: T[]) => void) => {
      setArray((prevArray) => {
        const newArray = [...prevArray]
        newArray.splice(index, 1)
        if (callback) {
          setTimeout(() => callback(newArray), 0)
        }
        return newArray
      })
    },
    [setArray]
  )

  return [array, addItem, modifyItem, removeItem, setArray] as const
}
