import { UndoRedoArray } from './undo-redo-array'
import { UndoRedo, UndoRedoFile } from '../undo-redo'
import { CrdtMessageType, Entity } from '@dcl/ecs'

describe('UndoRedoArray', () => {
  let buffer: ReturnType<typeof UndoRedoArray>

  beforeEach(() => {
    buffer = UndoRedoArray(10, 10)
  })

  it('Max entries size limit', () => {
    const myBuff = UndoRedoArray(2, 10)
    const undoRedo = (value: string): UndoRedo => ({
      $case: 'crdt',
      operations: [
        {
          entity: 1 as Entity,
          componentName: 'boedo',
          prevValue: null,
          newValue: value,
          operation: CrdtMessageType.PUT_COMPONENT
        }
      ]
    })
    myBuff.push(undoRedo('casla'))
    myBuff.push(undoRedo('casla-2'))
    myBuff.push(undoRedo('casla-3'))
    myBuff.push(undoRedo('casla-4'))
    const values = myBuff.values()
    expect(values[0].operations[0].newValue).toBe('casla-3')
    expect(values[1].operations[0].newValue).toBe('casla-4')
    expect(values[2]).toBeUndefined()
  })

  it('should push values to the buffer', () => {
    const undoRedo: UndoRedo = { $case: 'file', operations: [] }
    buffer.push(undoRedo)

    expect(buffer.values()).toEqual([undoRedo])
  })

  it('should pop values from the buffer', () => {
    const undoRedo1: UndoRedo = { $case: 'file', operations: [] }
    const undoRedo2: UndoRedo = { $case: 'crdt', operations: [] }
    buffer.push(undoRedo1)
    buffer.push(undoRedo2)

    expect(buffer.pop()).toEqual(undoRedo2)
    expect(buffer.values()).toEqual([undoRedo1])
  })

  it('should handle pushing more than the maximum size', () => {
    for (let i = 0; i < 15; i++) {
      const undoRedo: UndoRedo = { $case: 'file', operations: [] }
      buffer.push(undoRedo)
    }

    expect(buffer.values().length).toEqual(10)
  })

  it('should handle overwriting values when maximum entries size is reached', () => {
    const acc: UndoRedo[] = []
    for (let i = 0; i < 15; i++) {
      const undoRedo: UndoRedo = {
        $case: 'file',
        operations: []
      }
      buffer.push(undoRedo)
      acc.push(undoRedo)
    }

    const value = buffer.values()
    expect(value.length).toEqual(10)
    expect(value).toEqual(acc.slice(5))
  })

  it('should handle popping when the buffer is empty', () => {
    expect(buffer.pop()).toBeUndefined()
  })

  it('should clear the buffer', () => {
    const undoRedo: UndoRedo = { $case: 'file', operations: [] }
    buffer.push(undoRedo)
    buffer.clear()

    expect(buffer.values()).toEqual([])
  })

  it('should correctly calculate the size of the buffer', () => {
    const undoRedo1: UndoRedo = { $case: 'file', operations: [] }
    const undoRedo2: UndoRedo = { $case: 'crdt', operations: [] }
    buffer.push(undoRedo1)
    buffer.push(undoRedo2)
    buffer.pop()

    expect(buffer.values().length).toEqual(1)
  })

  it('should handle pushing file operations based on memory size', () => {
    const undoRedo: UndoRedoFile = {
      $case: 'file',
      operations: [
        { path: '/file1', prevValue: null, newValue: new Uint8Array([1, 2, 3]) },
        { path: '/file2', prevValue: null, newValue: new Uint8Array([4, 5, 6]) },
        { path: '/file3', prevValue: null, newValue: new Uint8Array([7, 8, 9]) }
      ]
    }

    buffer.push(undoRedo)

    expect(buffer.values()).toEqual([undoRedo])
    expect(buffer.memorySize).toEqual(9)
  })

  it('should handle popping file operations based on memory size', () => {
    const undoRedo: UndoRedoFile = {
      $case: 'file',
      operations: [
        { path: '/file1', prevValue: null, newValue: new Uint8Array([1, 2, 3]) },
        { path: '/file2', prevValue: null, newValue: new Uint8Array([4, 5, 6]) },
        { path: '/file3', prevValue: null, newValue: new Uint8Array([7, 8, 9]) }
      ]
    }

    buffer.push(undoRedo)
    buffer.pop()

    expect(buffer.values()).toEqual([])
    expect(buffer.memorySize).toEqual(0)
  })

  it('should not add file if operation exceeds max memory limit', () => {
    const undoRedo: UndoRedoFile = {
      $case: 'file',
      operations: [
        { path: '/file1', prevValue: null, newValue: new Uint8Array([1, 2, 3]) },
        { path: '/file2', prevValue: null, newValue: new Uint8Array([4, 5, 6]) },
        { path: '/file3', prevValue: null, newValue: new Uint8Array([7, 8, 9]) },
        { path: '/file4', prevValue: null, newValue: new Uint8Array([10, 11, 12]) }
      ]
    }

    expect(buffer.memorySize).toEqual(0)
    expect(buffer.push(undoRedo)).toBeUndefined()
    expect(buffer.values().length).toEqual(0)
    expect(buffer.values()).toEqual([])
  })

  it('should handle popping file operations when memory exceeds the limit', () => {
    const undoRedo: UndoRedoFile = {
      $case: 'file',
      operations: [
        { path: '/file1', prevValue: null, newValue: new Uint8Array([1, 2, 3]) },
        { path: '/file2', prevValue: null, newValue: new Uint8Array([4, 5, 6]) },
        { path: '/file3', prevValue: null, newValue: new Uint8Array([7, 8, 9, 10]) }
      ]
    }
    const undoRedo2: UndoRedoFile = {
      $case: 'file',
      operations: [{ path: '/file4', prevValue: null, newValue: new Uint8Array([11, 12, 13]) }]
    }

    buffer.push(undoRedo)
    buffer.push(undoRedo2)

    expect(buffer.memorySize).toEqual(3)
    expect(buffer.values()).toEqual([undoRedo2])

    const undoRedo3: UndoRedoFile = {
      $case: 'file',
      operations: [{ path: '/file5', prevValue: null, newValue: new Uint8Array([14, 15, 16]) }]
    }

    buffer.push(undoRedo3)

    expect(buffer.values()).toEqual([undoRedo2, undoRedo3])
  })
})
