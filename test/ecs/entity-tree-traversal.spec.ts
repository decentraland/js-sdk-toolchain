import { Engine, Entity, IEngine, Schemas, components, getComponentEntityTree } from '../../packages/@dcl/ecs/src'

describe('getComponentEntityTree', () => {
  describe('when the tree is a deep chain', () => {
    let deepestChild: Entity
    let engine: IEngine
    let entities: Entity[]
    let root: Entity

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

    it('should return every entity in the chain', () => {
      expect(entities).toHaveLength(12_001)
    })

    it('should yield the deepest child first', () => {
      expect(entities[0]).toBe(deepestChild)
    })

    it('should yield the root last', () => {
      expect(entities[entities.length - 1]).toBe(root)
    })
  })

  describe('when a parent has several children', () => {
    let engine: IEngine
    let entities: Entity[]
    let expected: Entity[]

    beforeEach(() => {
      engine = Engine()
      const TreeComponent = engine.defineComponent('test::WideTree', { parent: Schemas.Entity })
      const create = (parent?: Entity): Entity => {
        const entity = engine.addEntity()
        TreeComponent.create(entity, parent === undefined ? {} : { parent })
        return entity
      }

      const root = create()
      const first = create(root)
      const second = create(root)
      const third = create(root)
      const firstChild = create(first)
      const secondChild = create(first)

      // Each subtree is drained in sibling order before the parent is yielded.
      expected = [firstChild, secondChild, first, second, third, root]
      entities = Array.from(getComponentEntityTree(engine, root, TreeComponent))
    })

    it('should drain each subtree in sibling order before yielding the parent', () => {
      expect(entities).toEqual(expected)
    })
  })

  describe('when the parenting is cyclic', () => {
    let engine: IEngine
    let entities: Entity[]
    let expected: Entity[]

    beforeEach(() => {
      engine = Engine()
      const TreeComponent = engine.defineComponent('test::CyclicTree', { parent: Schemas.Entity })
      const root = engine.addEntity()
      const child = engine.addEntity()
      const grandChild = engine.addEntity()

      TreeComponent.create(root, {})
      TreeComponent.create(child, { parent: root })
      TreeComponent.create(grandChild, { parent: child })
      // Close the loop: the root now hangs off its own descendant.
      TreeComponent.getMutable(root).parent = grandChild

      expected = [grandChild, child, root]
      entities = Array.from(getComponentEntityTree(engine, root, TreeComponent))
    })

    it('should yield each entity once and terminate', () => {
      expect(entities).toEqual(expected)
    })
  })

  describe('when the root does not have the parenting component', () => {
    let engine: IEngine
    let entities: Entity[]

    beforeEach(() => {
      engine = Engine()
      const TreeComponent = engine.defineComponent('test::AbsentTree', { parent: Schemas.Entity })
      const root = engine.addEntity()

      entities = Array.from(getComponentEntityTree(engine, root, TreeComponent))
    })

    it('should yield nothing', () => {
      expect(entities).toEqual([])
    })
  })
})

describe('removeEntityWithChildren', () => {
  describe('when the tree is acyclic', () => {
    let collidersAfter: unknown[]
    let collidersBefore: unknown[]
    let tree: Entity[]

    beforeEach(() => {
      const engine = Engine()
      const Transform = components.Transform(engine)
      const MeshCollider = components.MeshCollider(engine)
      const createCube = (parent?: Entity): Entity => {
        const entity = engine.addEntity()
        Transform.create(entity, { parent })
        MeshCollider.create(entity, { mesh: { $case: 'box', box: {} } })
        return entity
      }

      const root = createCube()
      const first = createCube(root)
      const second = createCube(root)
      const third = createCube(root)
      const firstChild = createCube(first)
      const secondChild = createCube(first)
      const thirdChild = createCube(first)

      tree = [thirdChild, secondChild, firstChild, second, third, root]
      collidersBefore = tree.map((entity) => MeshCollider.getOrNull(entity))
      engine.removeEntityWithChildren(root)
      collidersAfter = tree.map((entity) => MeshCollider.getOrNull(entity))
    })

    it('should start with a collider on every entity in the tree', () => {
      expect(collidersBefore.filter((collider) => collider === null)).toEqual([])
    })

    it('should remove the collider from every entity in the tree', () => {
      expect(collidersAfter).toEqual(tree.map(() => null))
    })
  })

  describe('when the tree has recursive parenting', () => {
    let collidersAfter: unknown[]
    let collidersBefore: unknown[]
    let tree: Entity[]

    beforeEach(() => {
      const engine = Engine()
      const Transform = components.Transform(engine)
      const MeshCollider = components.MeshCollider(engine)
      const createCube = (parent?: Entity): Entity => {
        const entity = engine.addEntity()
        Transform.create(entity, { parent })
        MeshCollider.create(entity, { mesh: { $case: 'box', box: {} } })
        return entity
      }

      const root = createCube()
      const first = createCube(root)
      const second = createCube(root)
      const third = createCube(root)
      const firstChild = createCube(first)
      const secondChild = createCube(first)
      const thirdChild = createCube(first)
      const recursive = createCube(first)
      // Close the loop: the root now hangs off a descendant.
      Transform.getMutable(root).parent = recursive

      tree = [thirdChild, secondChild, firstChild, second, third, root, recursive]
      collidersBefore = tree.map((entity) => MeshCollider.getOrNull(entity))
      engine.removeEntityWithChildren(root)
      collidersAfter = tree.map((entity) => MeshCollider.getOrNull(entity))
    })

    it('should start with a collider on every entity in the tree', () => {
      expect(collidersBefore.filter((collider) => collider === null)).toEqual([])
    })

    it('should remove the collider from every entity in the cycle', () => {
      expect(collidersAfter).toEqual(tree.map(() => null))
    })
  })
})

describe('getComponentEntityTree, across component shapes', () => {
  let engine: IEngine
  let expectedTree: Entity[]
  let root: Entity
  let treeComponentEntities: Entity[]
  let unparentedComponentEntities: Entity[]
  let absentComponentEntities: Entity[]

  beforeEach(() => {
    engine = Engine()
    const Transform = components.Transform(engine)
    const MeshCollider = components.MeshCollider(engine)
    const TreeComponent = engine.defineComponent('test::MixedTree', { parent: Schemas.Entity })
    const createCube = (parent?: Entity): Entity => {
      const entity = engine.addEntity()
      MeshCollider.create(entity, { mesh: { $case: 'box', box: {} } })
      TreeComponent.create(entity, { parent })
      return entity
    }

    root = createCube()
    const first = createCube(root)
    const second = createCube(root)
    const third = createCube(root)
    const firstChild = createCube(first)
    const secondChild = createCube(first)
    const thirdChild = createCube(first)

    expectedTree = [firstChild, secondChild, thirdChild, first, second, third, root]
    treeComponentEntities = Array.from(getComponentEntityTree(engine, root, TreeComponent))
    // MeshCollider has no `parent` field, so nothing is ever indexed as a child.
    unparentedComponentEntities = Array.from(getComponentEntityTree(engine, root, MeshCollider))
    absentComponentEntities = Array.from(getComponentEntityTree(engine, root, Transform))
  })

  it('should return the whole tree for the parenting component', () => {
    expect(treeComponentEntities).toEqual(expect.arrayContaining(expectedTree))
  })

  it('should return only the root for a component without a parent field', () => {
    expect(unparentedComponentEntities).toEqual([root])
  })

  it('should return nothing when the root does not have the component', () => {
    expect(absentComponentEntities).toEqual([])
  })
})
