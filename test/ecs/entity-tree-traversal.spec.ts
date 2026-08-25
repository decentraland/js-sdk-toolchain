import {
  Engine,
  Entity,
  IEngine,
  Schemas,
  components,
  getComponentEntityTree,
  removeEntityWithChildren
} from '../../packages/@dcl/ecs/src'

type TreeComponent = ReturnType<IEngine['defineComponent']>

/** A parenting component plus a factory that creates entities already attached to it. */
function setupTree(engine: IEngine, componentName: string) {
  const TreeComponent = engine.defineComponent(componentName, { parent: Schemas.Entity })
  const create = (parent?: Entity): Entity => {
    const entity = engine.addEntity()
    TreeComponent.create(entity, parent === undefined ? {} : { parent })
    return entity
  }
  return { TreeComponent, create }
}

describe('getComponentEntityTree', () => {
  describe('when the tree is a deep chain', () => {
    let deepestChild: Entity
    let entities: Entity[]
    let root: Entity

    beforeEach(() => {
      const engine = Engine()
      const { TreeComponent, create } = setupTree(engine, 'test::DeepTree')
      root = create()

      let parent = root
      for (let i = 0; i < 12_000; i++) {
        parent = create(parent)
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

  describe('when parents have several children', () => {
    let entities: Entity[]
    let expected: Entity[]

    beforeEach(() => {
      const engine = Engine()
      const { TreeComponent, create } = setupTree(engine, 'test::WideTree')

      const root = create()
      const first = create(root)
      const second = create(root)
      const third = create(root)
      const firstChild = create(first)
      const secondChild = create(first)
      const thirdChild = create(first)

      // Each subtree is drained in sibling order before its parent is yielded.
      expected = [firstChild, secondChild, thirdChild, first, second, third, root]
      entities = Array.from(getComponentEntityTree(engine, root, TreeComponent))
    })

    it('should drain each subtree in sibling order before yielding the parent', () => {
      expect(entities).toEqual(expected)
    })
  })

  describe('when the parenting is cyclic', () => {
    let entities: Entity[]
    let expected: Entity[]

    beforeEach(() => {
      const engine = Engine()
      const { TreeComponent, create } = setupTree(engine, 'test::CyclicTree')

      const root = create()
      const child = create(root)
      const grandChild = create(child)
      // Close the loop: the root now hangs off its own descendant.
      TreeComponent.getMutable(root).parent = grandChild

      expected = [grandChild, child, root]
      entities = Array.from(getComponentEntityTree(engine, root, TreeComponent))
    })

    it('should yield each entity once and terminate', () => {
      expect(entities).toEqual(expected)
    })
  })

  describe('when the parent is the root entity', () => {
    let entities: Entity[]
    let expected: Entity[]

    beforeEach(() => {
      const engine = Engine()
      const TreeComponent = engine.defineComponent('test::RootParentedTree', { parent: Schemas.Entity })
      // Entity 0 is a legitimate parent key, and Schemas.Entity defaults to it.
      TreeComponent.create(engine.RootEntity, {})
      const first = engine.addEntity()
      const second = engine.addEntity()
      TreeComponent.create(first, { parent: engine.RootEntity })
      TreeComponent.create(second, { parent: engine.RootEntity })

      expected = [first, second, engine.RootEntity]
      entities = Array.from(getComponentEntityTree(engine, engine.RootEntity, TreeComponent))
    })

    it('should treat entity 0 as a parent rather than as absent', () => {
      expect(entities).toEqual(expected)
    })
  })

  describe('when the component has no parent field', () => {
    let entities: Entity[]
    let root: Entity

    beforeEach(() => {
      const engine = Engine()
      const MeshCollider = components.MeshCollider(engine)
      root = engine.addEntity()
      MeshCollider.create(root, { mesh: { $case: 'box', box: {} } })
      const child = engine.addEntity()
      MeshCollider.create(child, { mesh: { $case: 'box', box: {} } })

      entities = Array.from(getComponentEntityTree(engine, root, MeshCollider))
    })

    it('should return only the root', () => {
      expect(entities).toEqual([root])
    })
  })

  describe('when the root does not have the component', () => {
    let entities: Entity[]

    beforeEach(() => {
      const engine = Engine()
      const Transform = components.Transform(engine)
      const root = engine.addEntity()

      entities = Array.from(getComponentEntityTree(engine, root, Transform))
    })

    it('should yield nothing', () => {
      expect(entities).toEqual([])
    })
  })
})

describe('removeEntityWithChildren', () => {
  /** Builds a Transform-parented tree of cubes and reports collider state around removal. */
  function removeTree(closeTheLoop: boolean) {
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
    // `first` is an internal parent: checked so the middle of the tree is proven removed too.
    const tree = [thirdChild, secondChild, firstChild, first, second, third, root]

    if (closeTheLoop) {
      const recursive = createCube(first)
      tree.push(recursive)
      Transform.getMutable(root).parent = recursive
    }

    const before = tree.map((entity) => MeshCollider.getOrNull(entity))
    engine.removeEntityWithChildren(root)
    const after = tree.map((entity) => MeshCollider.getOrNull(entity))

    return { after, before, tree }
  }

  describe('when the tree is acyclic', () => {
    let after: unknown[]
    let before: unknown[]
    let tree: Entity[]

    beforeEach(() => {
      ;({ after, before, tree } = removeTree(false))
    })

    it('should start with a collider on every entity in the tree', () => {
      expect(before.filter((collider) => collider === null)).toEqual([])
    })

    it('should remove the collider from every entity in the tree', () => {
      expect(after).toEqual(tree.map(() => null))
    })
  })

  describe('when the tree has recursive parenting', () => {
    let after: unknown[]
    let before: unknown[]
    let tree: Entity[]

    beforeEach(() => {
      ;({ after, before, tree } = removeTree(true))
    })

    it('should start with a collider on every entity in the tree', () => {
      expect(before.filter((collider) => collider === null)).toEqual([])
    })

    it('should remove the collider from every entity in the cycle', () => {
      expect(after).toEqual(tree.map(() => null))
    })
  })

  describe('and the entity is synchronized with cyclic network parenting', () => {
    let child: Entity
    let parent: Entity
    let removed: Entity[]

    beforeEach(() => {
      const engine = Engine()
      const NetworkEntity = components.NetworkEntity(engine)
      const NetworkParent = components.NetworkParent(engine)

      parent = engine.addEntity()
      child = engine.addEntity()
      NetworkEntity.create(parent, { entityId: 1 as Entity, networkId: 1 })
      NetworkEntity.create(child, { entityId: 2 as Entity, networkId: 1 })
      NetworkParent.create(child, { entityId: 1 as Entity, networkId: 1 })
      // Close the loop: the parent is also registered as a child of its own child.
      NetworkParent.create(parent, { entityId: 2 as Entity, networkId: 1 })

      removed = []
      // engine.removeEntityWithChildren passes its own closure-scoped removeEntity, so the
      // helper is called directly to observe the removals.
      removeEntityWithChildren(
        {
          removeEntity: (entity: Entity) => {
            removed.push(entity)
            return engine.removeEntity(entity)
          },
          defineComponentFromSchema: engine.defineComponentFromSchema,
          defineComponent: engine.defineComponent,
          getEntitiesWith: engine.getEntitiesWith
        },
        parent
      )
    })

    it('should remove each entity in the cycle exactly once, parent first', () => {
      expect(removed).toEqual([parent, child])
    })
  })
})
