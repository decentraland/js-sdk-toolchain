import {
  ComponentDefinition,
  CompositeDefinition,
  CrdtMessageType,
  Entity,
  IEngine,
  LastWriteWinElementSetComponentDefinition
} from '@dcl/ecs'
import { streamEvent } from './stream'

export type UndoRedo = {
  entity: Entity
  componentName: string
  value: unknown
  operation: CrdtMessageType
}

export function initUndoRedo(engine: IEngine, getComposite: () => CompositeDefinition) {
  const undoList: UndoRedo[][] = []
  const redoList: UndoRedo[][] = []
  const acc: UndoRedo[] = []

  function getAndCleanArray(arr: unknown[]): unknown[] {
    return arr.splice(0, arr.length)
  }

  streamEvent.on('streamStart', () => {
    getAndCleanArray(redoList)
    getAndCleanArray(acc)
  })

  streamEvent.on('streamEnd', () => {
    const changes = getAndCleanArray(acc) as UndoRedo[]
    if (changes.length) {
      undoList.push(changes)
    }
  })

  function onChange(
    entity: Entity,
    operation: CrdtMessageType,
    component: ComponentDefinition<unknown> | undefined,
    _componentValue: unknown
  ) {
    if (!getComposite()) {
      return
    }
    // Add undo operation
    // TODO: entitySelected doesn't exists on composite
    if (operation === CrdtMessageType.PUT_COMPONENT || operation === CrdtMessageType.DELETE_COMPONENT) {
      const prevValue = findValue(getComposite(), component!.componentName, entity)
      acc.push({ entity, operation, componentName: component!.componentName, value: prevValue })
    }
  }

  function findValue(composite: CompositeDefinition, componentName: string, entity: Entity) {
    const component = composite.components.find((c) => c.name === componentName)
    const value = component?.data.get(entity)

    if (value?.data?.$case !== 'json') {
      return null
    }

    return value.data.json
  }

  function updateOperation(operations: UndoRedo[]) {
    const opAcc: UndoRedo[] = []

    for (const operation of operations) {
      const component = engine.getComponent(
        operation.componentName
      ) as LastWriteWinElementSetComponentDefinition<unknown>
      const oldValue = component.getOrNull(operation.entity)
      opAcc.push({ ...operation, value: oldValue })

      if (operation.value === null) {
        component.deleteFrom(operation.entity)
      } else {
        component.createOrReplace(operation.entity, operation.value)
      }
    }
    return opAcc
  }

  return {
    async redo() {
      const msg = redoList.pop()
      if (msg) {
        undoList.push(updateOperation(msg))
        await engine.update(1 / 16)
      }
    },
    async undo() {
      const msg = undoList.pop()
      if (msg) {
        redoList.push(updateOperation(msg))
        await engine.update(1 / 16)
      }
    },
    onChange
  }
}
