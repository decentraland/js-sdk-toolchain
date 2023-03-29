import {
  ComponentDefinition,
  CompositeDefinition,
  CrdtMessageType,
  Entity,
  IEngine,
  LastWriteWinElementSetComponentDefinition
} from '@dcl/ecs'

export type UndoRedo = {
  entity: Entity
  componentName: string
  value: unknown
  operation: CrdtMessageType
}

export function initUndoRedo(engine: IEngine, getComposite: () => CompositeDefinition) {
  const undoList: UndoRedo[] = []
  const redoList: UndoRedo[] = []

  function onChange(
    entity: Entity,
    operation: CrdtMessageType,
    component: ComponentDefinition<unknown> | undefined,
    _componentValue: unknown
  ) {
    if (!getComposite()) {
      return
    }
    // Check if the changes are because of an undo or is something new
    const hasRedo = redoList[redoList.length - 1]
    if (hasRedo && hasRedo.entity === entity && hasRedo.componentName === component?.componentName) {
      return
    }

    // clean redoList
    redoList.length = 0

    // Add undo operation
    if (operation === CrdtMessageType.PUT_COMPONENT) {
      const prevValue = findValue(getComposite(), component!.componentName, entity)
      undoList.push({ entity, operation, componentName: component!.componentName, value: prevValue })
    }
  }

  function findValue(composite: CompositeDefinition, componentName: string, entity: Entity) {
    const component = composite.components.find((c) => c.name === componentName)
    // console.log(JSON.stringify(composite, null, 2))
    const value = component?.data.get(entity)

    if (value?.data?.$case !== 'json') {
      return null
    }
    return value.data.json
  }

  async function updateOperation(operation: UndoRedo) {
    const component = engine.getComponent(operation.componentName) as LastWriteWinElementSetComponentDefinition<unknown>

    if (operation.value === null) {
      component.deleteFrom(operation.entity)
    } else {
      component.createOrReplace(operation.entity, operation.value)
    }
    await engine.update(1 / 16)
  }

  return {
    async redo() {
      const lastMsg = redoList.pop()
      if (!lastMsg) return {}

      await updateOperation(lastMsg)
    },
    async undo() {
      const lastMsg = undoList.pop()
      if (!lastMsg) return {}
      // Add message to Redo List
      const value = engine.getComponent(lastMsg.componentName).get(lastMsg.entity)
      redoList.push({ ...lastMsg, value })

      // Update component
      await updateOperation(lastMsg)
    },
    onChange
  }
}
