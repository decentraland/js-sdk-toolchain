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
import { findPrevValue, isEqual } from './utils/component'

export type UndoRedoCrdt = { $case: 'crdt'; operations: CrdtOperation[] }
export type CrdtOperation = {
  entity: Entity
  componentName: string
  prevValue: unknown
  newValue: unknown
  operation: CrdtMessageType
}
export type UndoRedoFile = { $case: 'file'; operations: FileOperation[] }
export type FileOperation = {
  path: string
  prevValue: Uint8Array | null
  newValue: Uint8Array | null
}

export type UndoRedo = UndoRedoFile | UndoRedoCrdt
export const isCrdtOperation = (undoRedo: UndoRedo): undoRedo is UndoRedoCrdt => {
  return undoRedo.$case === 'crdt'
}

function getAndCleanArray<T = unknown>(arr: T[]): T[] {
  return arr.splice(0, arr.length)
}

export function initUndoRedo(fs: FileSystemInterface, engine: IEngine, getComposite: () => CompositeDefinition) {
  const undoList: UndoRedo[] = []
  const redoList: UndoRedo[] = []
  const crdtAcc: CrdtOperation[] = []

  function onChange(
    entity: Entity,
    operation: CrdtMessageType,
    component: ComponentDefinition<unknown> | undefined,
    _componentValue: unknown
  ) {
    if (!getComposite()) {
      return
    }

    // TODO: selection doesn't exists on composite
    if (operation === CrdtMessageType.PUT_COMPONENT || operation === CrdtMessageType.DELETE_COMPONENT) {
      const lastRedo = redoList[redoList.length - 1]
      if (
        lastRedo &&
        lastRedo.$case === 'crdt' &&
        lastRedo.operations.find(
          ($) =>
            $.componentName === component?.componentName &&
            $.entity === entity &&
            isEqual(component!, _componentValue, $.newValue)
        )
      ) {
        return
      }
      const prevValue = findPrevValue(getComposite(), component!.componentName, entity)
      crdtAcc.push({
        entity,
        operation,
        componentName: component!.componentName,
        prevValue,
        newValue: _componentValue
      })
    }
  }

  async function undoRedoLogic(message: UndoRedo): Promise<void> {
    if (message.$case === 'crdt') {
      for (const operation of message.operations) {
        const component = engine.getComponent(
          operation.componentName
        ) as LastWriteWinElementSetComponentDefinition<unknown>

        if (operation.prevValue === null) {
          component.deleteFrom(operation.entity)
        } else {
          component.createOrReplace(operation.entity, operation.prevValue)
        }
      }
    } else if (message.$case === 'file') {
      for (const operation of message.operations) {
        await upsertAsset(fs, operation.path, operation.prevValue)
      }
    }
  }

  function invertMessage<T extends UndoRedo>(message: T): T {
    const opAcc: T['operations'] = []
    for (const operation of message.operations) {
      opAcc.push({ ...operation, prevValue: operation.newValue, newValue: operation.prevValue } as any)
    }
    return { ...message, operations: opAcc }
  }

  return {
    async redo() {
      const msg = redoList.pop()
      if (msg) {
        undoList.push(invertMessage(msg))
        await undoRedoLogic(msg)
        await engine.update(1 / 16)
      }
      getAndCleanArray(crdtAcc)
      return { type: msg?.$case ?? '' }
    },
    async undo() {
      const msg = undoList.pop()
      if (msg) {
        redoList.push(invertMessage(msg))
        await undoRedoLogic(msg)
        await engine.update(1 / 16)
      }
      getAndCleanArray(crdtAcc)
      return { type: msg?.$case ?? '' }
    },
    onChange,
    addUndoFile(operations: FileOperation[]) {
      getAndCleanArray(redoList)
      undoList.push({ $case: 'file', operations })
    },
    addUndoCrdt() {
      // TODO: when we delete an entity it's sending a delete EntityNdoe that idk from where its comming
      // and its breaking the whole undo/redo logic.
      const lostEntityNodeBug = crdtAcc.length === 1 && crdtAcc[0].componentName === 'editor::EntityNode'
      const changes = getAndCleanArray(crdtAcc)
      if (changes.length && !lostEntityNodeBug) {
        getAndCleanArray(redoList)
        undoList.push({ $case: 'crdt', operations: changes })
      }
    }
  }
}
