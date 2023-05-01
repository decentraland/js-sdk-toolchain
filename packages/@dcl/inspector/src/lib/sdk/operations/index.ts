import { IEngine } from '@dcl/ecs'
import removeEntity from './remove-entity'
import updateValue from './update-value'
import addChild from './add-child'
import updateSelectedEntity from './update-selected-entity'

export function createOperations(engine: IEngine) {
  return {
    removeEntity: removeEntity(engine),
    updateValue: updateValue(engine),
    addChild: addChild(engine),
    updateSelectedEntity: updateSelectedEntity(engine),
    dispatch: () => engine.update(1)
  }
}