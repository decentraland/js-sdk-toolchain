import { IEngine, Engine, TransformComponentExtended, Entity, Name, engine } from '@dcl/ecs'
import { duplicateEntity } from './duplicate-entity'
import { EditorComponentNames, EditorComponents, createEditorComponents } from '../components'
import * as components from '@dcl/ecs/dist/components'

const ROOT = engine.RootEntity

describe('duplicateEntity', () => {
  let engine: IEngine
  let TransformComponent: TransformComponentExtended
  let NameComponent: typeof Name
  let Nodes: EditorComponents['Nodes']
  let SelectionComponent: EditorComponents['Selection']
  beforeEach(() => {
    engine = Engine()
    NameComponent = components.Name(engine)
    TransformComponent = components.Transform(engine)
    Nodes = createEditorComponents(engine).Nodes
    Nodes.create(ROOT, { value: [{ entity: ROOT, children: [] }] })
    SelectionComponent = engine.getComponent(EditorComponentNames.Selection) as EditorComponents['Selection']
  })
  it('should correctly duplicate an entity', () => {
    const original = engine.addEntity()
    TransformComponent.create(original)
    const originalChild = engine.addEntity()
    TransformComponent.create(originalChild, { parent: original, position: { x: 1, y: 1, z: 1 } })
    NameComponent.create(originalChild, { value: 'child' })
    Nodes.createOrReplace(ROOT, {
      value: [
        { entity: ROOT, children: [original, originalChild] },
        { entity: original, children: [originalChild] },
        { entity: originalChild, children: [] }
      ]
    })

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

    const nodesAfter = [
      { entity: ROOT, children: [original, originalChild, duplicate] },
      { entity: original, children: [originalChild] },
      { entity: originalChild, children: [] },
      { entity: duplicate, children: [duplicateChild] },
      { entity: duplicateChild, children: [] }
    ]

    expect(duplicateChild).not.toBe(null)
    expect(duplicateChild).not.toBe(original)
    expect(duplicateChild).not.toBe(originalChild)
    expect(duplicateChild).not.toBe(duplicate)
    expect(NameComponent.get(duplicateChild!).value).toBe(NameComponent.get(originalChild).value)
    expect(Nodes.get(ROOT).value).toStrictEqual(nodesAfter)
  })
})
