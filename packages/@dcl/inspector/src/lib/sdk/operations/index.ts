import { IEngine } from '@dcl/ecs'

import removeEntity from './remove-entity'
import updateValue from './update-value'
import addChild from './add-child'
import updateSelectedEntity from './update-selected-entity'
import setParent from './set-parent'
import { reorder } from './reorder'
import removeSelectedEntities from './remove-selected-entities'
import getSelectedEntities from './get-selected-entities'
import addAsset from './add-asset'
import addComponent from './add-component'
import removeComponent from './remove-component'
import duplicateEntity from './duplicate-entity'
import { updateCanSave } from '../../../redux/app'
import { store } from '../../../redux/store'

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
    reorder: reorder(engine),
    addComponent: addComponent(engine),
    removeComponent: removeComponent(engine),
    updateSelectedEntity: updateSelectedEntity(engine),
    removeSelectedEntities: removeSelectedEntities(engine),
    duplicateEntity: duplicateEntity(engine),
    dispatch: async ({ dirty = true }: Dispatch = {}) => {
      store.dispatch(updateCanSave({ dirty }))
      await engine.update(1)
    },
    getSelectedEntities: getSelectedEntities(engine)
  }
}

export type Operations = ReturnType<typeof createOperations>
