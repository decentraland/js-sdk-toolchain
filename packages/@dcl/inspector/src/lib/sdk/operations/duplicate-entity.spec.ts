import { IEngine, Engine, TransformComponentExtended, Entity, Name } from '@dcl/ecs'
import { duplicateEntity } from './duplicate-entity'
import { EditorComponentNames, EditorComponents, createEditorComponents } from '../components'
import * as components from '@dcl/ecs/dist/components'

describe('duplicateEntity', () => {
  let engine: IEngine
  let TransformComponent: TransformComponentExtended
  let NameComponent: typeof Name
  let SelectionComponent: EditorComponents['Selection']
  beforeEach(() => {
    engine = Engine()
    NameComponent = components.Name(engine)
    TransformComponent = components.Transform(engine)
    createEditorComponents(engine)
    SelectionComponent = engine.getComponent(EditorComponentNames.Selection) as EditorComponents['Selection']
  })
  it('should correctly duplicate an entity', () => {
    const original = engine.addEntity()
    TransformComponent.create(original)
    const originalChild = engine.addEntity()
    TransformComponent.create(originalChild, { parent: original, position: { x: 1, y: 1, z: 1 } })
    NameComponent.create(originalChild, { value: 'child' })

    const duplicate = duplicateEntity(engine)(original)
    expect(duplicate).not.toBe(null)
    expect(duplicate).not.toBe(original)
    expect(duplicate).not.toBe(originalChild)
    expect(SelectionComponent.getOrNull(duplicate)).not.toBeNull()

    let duplicateChild: Entity | null = null
    for (const [entity, entityTransform] of engine.getEntitiesWith(TransformComponent)) {
      if (entityTransform.parent === duplicate) {
        duplicateChild = entity
        break
      }
    }

    expect(duplicateChild).not.toBe(null)
    expect(duplicateChild).not.toBe(original)
    expect(duplicateChild).not.toBe(originalChild)
    expect(duplicateChild).not.toBe(duplicate)
    expect(NameComponent.get(duplicateChild!).value).toBe(NameComponent.get(originalChild).value)
  })
})
