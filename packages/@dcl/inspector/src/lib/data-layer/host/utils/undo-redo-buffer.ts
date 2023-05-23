import { UndoRedo, UndoRedoFile, UndoRedoGetter } from '../undo-redo'

const ONE_MB_IN_BYTES = 1_048_576
const ONE_GB_IN_BYTES = ONE_MB_IN_BYTES * 1024

// Custom circular buffer implementation for undo/redo...
export class UndoRedoBuffer {
  private tail: number
  private head: number
  private list: (UndoRedo | undefined)[]
  private entriesSize: number
  private memorySize: number
  private getValue: UndoRedoGetter

  constructor(public maxEntries: number, getValue: UndoRedoGetter, public maxSize: number = ONE_GB_IN_BYTES) {
    this.list = new Array(maxEntries)
    this.tail = 0
    this.head = 0
    this.entriesSize = 0
    this.memorySize = 0
    this.getValue = getValue
  }

  private pushValue(value: UndoRedo) {
    this.list[this.tail % this.maxEntries] = value
    this.tail++
    this.head = Math.max(this.head, this.tail - this.maxEntries)
    this.entriesSize = Math.min(this.tail - this.head, this.maxEntries)

    return this.tail
  }

  push(value: UndoRedo) {
    if (value.$case === 'file') return this.pushFile(value)
    return this.pushValue(value)
  }

  pop(): UndoRedo | undefined {
    if (this.entriesSize === 0) return undefined

    this.tail = Math.max(this.head, this.tail - 1)
    this.entriesSize = Math.max(this.entriesSize - 1, 0)

    const value = this.list[this.tail % this.maxEntries]

    if (value?.$case === 'file') this.popFile(value)

    return value
  }

  clear() {
    this.list.fill(undefined)
    this.head = 0
    this.tail = 0
    this.entriesSize = 0
    this.memorySize = 0
  }

  get(): readonly (UndoRedo | undefined)[] {
    let idx = this.head % this.maxEntries
    const arr: (UndoRedo | undefined)[] = []
    for (let i = 0; i < this.entriesSize; i++) {
      arr.push(this.list[idx])
      idx = (idx + 1) % this.maxEntries
    }
    return arr
  }

  private pushFile(value: UndoRedoFile) {
    let valueSize: number = 0
    for (const operation of value.operations) {
      const _value = this.getValue(operation)
      valueSize += _value?.length || 0
    }

    if (valueSize > this.maxSize) throw new Error(`File size exceeds memory limit size`)

    let idx = this.head
    while (valueSize + this.memorySize > this.maxSize && idx !== this.tail) {
      const _value = this.list[idx]
      if (_value?.$case === 'file') this.popFile(_value)
      this.list[idx] = undefined
      idx++
    }

    this.memorySize += valueSize
    this.head = idx
    return this.pushValue(value)
  }

  private popFile(value: UndoRedoFile) {
    for (const operation of value.operations) {
      const _value = this.getValue(operation)
      const fileSize = _value?.length || 0
      this.memorySize -= fileSize
    }
  }

  get size() {
    return this.entriesSize
  }

  get inMemorySize() {
    return this.memorySize
  }
}
