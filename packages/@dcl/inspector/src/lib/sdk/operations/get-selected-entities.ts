import { IEngine } from '@dcl/ecs'
import { EditorComponentNames, EditorComponents } from '../components'

export function getSelectedEntities(engine: IEngine) {
  return function getSelectedEntities() {
    const entities = []
    const Selection = engine.getComponent(EditorComponentNames.Selection) as EditorComponents['Selection']
    for (const [entity] of engine.getEntitiesWith(Selection)) {
      entities.push(entity)
    }

    return entities
  }
}

export default getSelectedEntities
