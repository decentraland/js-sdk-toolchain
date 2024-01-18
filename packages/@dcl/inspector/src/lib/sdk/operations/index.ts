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
import {
  error as sdkOperationErrorAction,
  clearError as sdkOperationClearErrorAction,
  ErrorType
} from '../../../redux/sdk'

export interface Dispatch {
  dirty?: boolean
  error?: ErrorType
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
    dispatch: async ({ dirty = true, error = undefined }: Dispatch = {}) => {
      store.dispatch(updateCanSave({ dirty }))
      if (error) {
        store.dispatch(sdkOperationErrorAction({ error }))
      } else if (store.getState().sdk.error) {
        store.dispatch(sdkOperationClearErrorAction())
      }
      await engine.update(1)
    },
    getSelectedEntities: getSelectedEntities(engine)
  }
}

export type Operations = ReturnType<typeof createOperations>
