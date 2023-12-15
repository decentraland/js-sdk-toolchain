import {
  ComponentDefinition,
  CompositeDefinition,
  CrdtMessageType,
  Entity,
  IEngine,
  LastWriteWinElementSetComponentDefinition
} from '@dcl/ecs'
import upsertAsset from './upsert-asset'
import { FileSystemInterface } from '../types'
import { findPrevValue } from './utils/component'
import { UndoRedoArray } from './utils/undo-redo-array'
import { isFileInAssetDir, withAssetDir } from './fs-utils'

export type UndoRedoCrdt = { $case: 'crdt'; operations: CrdtOperation[] }
export type UndoRedoFile = { $case: 'file'; operations: FileOperation[] }
export type CrdtOperation = {
  entity: Entity
  componentName: string
  prevValue: unknown
  newValue: unknown
  operation: CrdtMessageType
}
export type FileOperation = {
  path: string
  prevValue: Uint8Array | null
  newValue: Uint8Array | null
}

export type UndoRedo = UndoRedoFile | UndoRedoCrdt
export type UndoRedoOp = UndoRedo['operations'][0]
export type UndoRedoGetter = <T extends UndoRedoOp>(op: T) => T['newValue']

function getAndCleanArray<T = unknown>(arr: T[]): T[] {
  return arr.splice(0, arr.length)
}

const isNil = (val: unknown) => val === null || val === undefined

const getUndoValue: UndoRedoGetter = (val) => val.prevValue
const getRedoValue: UndoRedoGetter = (val) => val.newValue

export function initUndoRedo(fs: FileSystemInterface, engine: IEngine, getComposite: () => CompositeDefinition) {
  const undoList = UndoRedoArray(1024)
  const redoList = UndoRedoArray(1024)
  const crdtAcc: CrdtOperation[] = []

  function onChange(
    entity: Entity,
    operation: CrdtMessageType,
    component: ComponentDefinition<unknown> | undefined,
    _componentValue: unknown
  ) {
    const composite = getComposite()
    if (!composite) {
      return
    }

    // TODO: selection doesn't exists on composite
    if (operation === CrdtMessageType.PUT_COMPONENT || operation === CrdtMessageType.DELETE_COMPONENT) {
      const prevValue = findPrevValue(composite, component!.componentName, entity)
      crdtAcc.push({
        entity,
        operation,
        componentName: component!.componentName,
        prevValue,
        newValue: _componentValue
      })
    }
  }

  async function undoRedoLogic(message: UndoRedo, getValue: UndoRedoGetter): Promise<void> {
    if (message.$case === 'crdt') {
      for (const operation of message.operations) {
        const component = engine.getComponent(
          operation.componentName
        ) as LastWriteWinElementSetComponentDefinition<unknown>
        const value = getValue(operation)

        if (isNil(value)) {
          component.deleteFrom(operation.entity)
        } else {
          component.createOrReplace(operation.entity, value)
        }
      }
    } else if (message.$case === 'file') {
      for (const operation of message.operations) {
        await upsertAsset(
          fs,
          isFileInAssetDir(operation.path) ? operation.path : withAssetDir(operation.path),
          getValue(operation)
        )
      }
    }
  }

  return {
    async undo() {
      const msg = undoList.pop()
      if (msg) {
        redoList.push(msg)
        await undoRedoLogic(msg, getUndoValue)
        await engine.update(1 / 16)
      }
      getAndCleanArray(crdtAcc)
      return { type: msg?.$case ?? '' }
    },
    async redo() {
      const msg = redoList.pop()
      if (msg) {
        undoList.push(msg)
        await undoRedoLogic(msg, getRedoValue)
        await engine.update(1 / 16)
      }
      getAndCleanArray(crdtAcc)
      return { type: msg?.$case ?? '' }
    },
    onChange,
    addUndoFile(operations: FileOperation[]) {
      redoList.clear()
      undoList.push({ $case: 'file', operations })
    },
    addUndoCrdt() {
      const changes = getAndCleanArray(crdtAcc)
      if (changes.length) {
        redoList.clear()
        undoList.push({ $case: 'crdt', operations: changes })
      }
    }
  }
}
