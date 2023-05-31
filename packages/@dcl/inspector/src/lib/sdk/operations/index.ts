import { IEngine } from '@dcl/ecs'

import { saveEvent } from '../../../hooks/editor/useSave'

import removeEntity from './remove-entity'
import updateValue from './update-value'
import addChild from './add-child'
import updateSelectedEntity from './update-selected-entity'
import setParent from './set-parent'
import removeSelectedEntities from './remove-selected-entities'
import addAsset from './add-asset'
import addComponent from './add-component'
import removeComponent from './remove-component'

export interface Dispatch {
  dirty?: boolean
}

export function createOperations(engine: IEngine) {
  return {
    removeEntity: removeEntity(engine),
    updateValue: updateValue(engine),
    addChild: addChild(engine),
    addAsset: addAsset(engine),
    setParent: setParent(engine),
    addComponent: addComponent(engine),
    removeComponent: removeComponent(engine),
    updateSelectedEntity: updateSelectedEntity(engine),
    removeSelectedEntities: removeSelectedEntities(engine),
    dispatch: async ({ dirty = true }: Dispatch = {}) => {
      await engine.update(1)
      saveEvent.emit('change', dirty)
    }
  }
}

export type Operations = ReturnType<typeof createOperations>
