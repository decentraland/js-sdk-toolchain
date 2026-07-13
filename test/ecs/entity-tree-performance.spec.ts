import { Engine, Entity, Schemas, getComponentEntityTree } from '../../packages/@dcl/ecs/src'

describe('when traversing a deeply nested entity tree', () => {
  let engine: ReturnType<typeof Engine>
  let root: Entity
  let deepestChild: Entity
  let entities: Entity[]

  beforeEach(() => {
    engine = Engine()
    const TreeComponent = engine.defineComponent('test::DeepTree', { parent: Schemas.Entity })
    root = engine.addEntity()
    TreeComponent.create(root, {})

    let parent = root
    for (let i = 0; i < 12_000; i++) {
      const child = engine.addEntity()
      TreeComponent.create(child, { parent })
      parent = child
    }
    deepestChild = parent

    entities = Array.from(getComponentEntityTree(engine, root, TreeComponent))
  })

  it('should return every entity in child-first order without overflowing the call stack', () => {
    expect(entities).toHaveLength(12_001)
    expect(entities[0]).toBe(deepestChild)
    expect(entities[entities.length - 1]).toBe(root)
  })
})
