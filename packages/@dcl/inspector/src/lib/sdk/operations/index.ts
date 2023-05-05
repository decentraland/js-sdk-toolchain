import { IEngine } from '@dcl/ecs'
import removeEntity from './remove-entity'
import updateValue from './update-value'
import addChild from './add-child'
import updateSelectedEntity from './update-selected-entity'
import setParent from './set-parent'
import removeSelectedEntities from './remove-selected-entities'

export function createOperations(engine: IEngine) {
  return {
    removeEntity: removeEntity(engine),
    updateValue: updateValue(engine),
    addChild: addChild(engine),
    setParent: setParent(engine),
    updateSelectedEntity: updateSelectedEntity(engine),
    removeSelectedEntities: removeSelectedEntities(engine),
    dispatch: () => engine.update(1)
  }
}
