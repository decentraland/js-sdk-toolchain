import { Engine, IEngine, Transform as TransformEngine, Name as NameEngine } from '@dcl/ecs'
import { createCustomAsset } from './create-custom-asset'
import { EditorComponents, createEditorComponents } from '../components'
import * as components from '@dcl/ecs/dist/components'

describe('createCustomAsset', () => {
  let engine: IEngine
  let Transform: typeof TransformEngine
  let Name: typeof NameEngine
  let Selection: EditorComponents['Selection']
  let Nodes: EditorComponents['Nodes']

  beforeEach(() => {
    engine = Engine()
    Transform = components.Transform(engine)
    Name = components.Name(engine)
    const editorComponents = createEditorComponents(engine)
    Selection = editorComponents.Selection
    Nodes = editorComponents.Nodes

    // Initialize root node
    Nodes.create(engine.RootEntity, {
      value: [{ entity: engine.RootEntity, children: [] }]
    })
  })

  it('should create a custom asset from selected entities', () => {
    // Create test entities
    const entity1 = engine.addEntity()
    const entity2 = engine.addEntity()

    // Setup entities
    Transform.create(entity1, { position: { x: 1, y: 1, z: 1 } })
    Transform.create(entity2, { parent: entity1, position: { x: 0, y: 1, z: 0 } })
    Name.create(entity1, { value: 'Parent' })
    Name.create(entity2, { value: 'Child' })

    // Select entities
    Selection.create(entity1)
    Selection.create(entity2)

    // Create custom asset
    const createCustomAssetFn = createCustomAsset(engine)
    const result = createCustomAssetFn([entity1, entity2])

    expect(result).toBeDefined()
    expect(result.composite).toBeDefined()
    expect(result.composite.components).toBeDefined()
    expect(result.composite.components.length).toBeGreaterThan(0)
  })

  it('should handle empty selection', () => {
    const createCustomAssetFn = createCustomAsset(engine)
    const result = createCustomAssetFn([])

    expect(result).toBeDefined()
    expect(result.composite).toBeDefined()
    expect(result.composite.components).toEqual([])
    expect(result.resources).toEqual([])
  })

  it('should preserve component data in the composite', () => {
    const entity = engine.addEntity()
    Transform.create(entity, { position: { x: 1, y: 2, z: 3 } })
    Name.create(entity, { value: 'TestEntity' })
    Selection.create(entity)

    const createCustomAssetFn = createCustomAsset(engine)
    const result = createCustomAssetFn([entity])
    console.log(JSON.stringify(result, null, 2), entity)
    const nameComponent = result.composite.components.find((c) => c.name === NameEngine.componentName)
    expect(nameComponent).toBeDefined()
    expect(nameComponent?.data[0].json.value).toEqual('TestEntity')
  })
})
