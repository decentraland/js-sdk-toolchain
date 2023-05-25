import { UndoRedo } from '../undo-redo'

const ONE_MB_IN_BYTES = 1_048_576
const ONE_GB_IN_BYTES = ONE_MB_IN_BYTES * 1024

export function UndoRedoArray(maxEntries: number, maxSize: number = ONE_GB_IN_BYTES) {
  const valueList: UndoRedo[] = []
  let memorySize: number = 0

  function valueSize(val?: UndoRedo) {
    let fileSize: number = 0
    if (val?.$case === 'file') {
      for (const operation of val.operations) {
        fileSize += operation.newValue?.length ?? 0
        fileSize += operation.prevValue?.length ?? 0
      }
    }
    return fileSize
  }

  return {
    push(value: UndoRedo) {
      // If we reach the max entries, remove the first element and calc size
      while (valueList.length >= maxEntries) {
        const valToRemove = valueList.shift()
        memorySize -= valueSize(valToRemove)
      }

      // Add current value size to the memory
      const currentSize = valueSize(value)
      memorySize += currentSize

      // add the value to the list.
      valueList.push(value)

      // if we reach the max_size limit, start removing files.
      while (memorySize >= maxSize) {
        for (let index = 0; index <= valueList.length - 1; index++) {
          const size = valueSize(valueList[index])
          if (size) {
            memorySize -= size
            valueList.splice(index, 1)
            break
          }
        }
      }
      return valueList[valueList.length - 1] === value ? value : undefined
    },
    pop() {
      const value = valueList.pop()
      memorySize -= valueSize(value)
      return value
    },
    clear() {
      memorySize = 0
      valueList.length = 0
    },
    values() {
      return Array.from(valueList)
    },
    get memorySize() {
      return memorySize
    }
  }
}
