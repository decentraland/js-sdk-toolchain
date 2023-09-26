import { IEngine, Engine } from '@dcl/ecs'
import { EditorComponents, createEditorComponents } from './components'
import { pushChild, removeNode, removeChild, filterChild, getAncestors, isAncestor, mapNodes } from './nodes'

describe('Node Operations', () => {
  let engine: IEngine
  let Nodes: EditorComponents['Nodes']

  beforeEach(() => {
    engine = Engine()
    Nodes = createEditorComponents(engine).Nodes
  })
  describe('removeNode', () => {
    it('should remove the specified node from the nodes', () => {
      const entity1 = engine.addEntity()
      const entityToRemove = engine.addEntity()
      Nodes.create(engine.RootEntity, {
        value: [
          { entity: engine.RootEntity, children: [entity1, entityToRemove] },
          { entity: entity1, children: [] },
          { entity: entityToRemove, children: [] }
        ]
      })

      const result = removeNode(engine, entityToRemove)
      const expected = [
        { entity: engine.RootEntity, children: [entity1] },
        { entity: entity1, children: [] }
      ]

      expect(result).toEqual(expected)
    })

    it('should not remove any node if the specified node does not exist', () => {
      const entity1 = engine.addEntity()
      const entity2 = engine.addEntity()
      const entityToRemove = engine.addEntity()
      const value = [
        { entity: engine.RootEntity, children: [entity1, entity2] },
        { entity: entity1, children: [] },
        { entity: entity2, children: [] }
      ]

      Nodes.create(engine.RootEntity, { value })

      const result = removeNode(engine, entityToRemove)

      expect(result).toEqual(value)
    })
  })

  describe('pushChild', () => {
    it('should add a child to the parent node and to the tree', () => {
      const parent = engine.addEntity()
      const child = engine.addEntity()
      Nodes.create(engine.RootEntity, {
        value: [
          { entity: engine.RootEntity, children: [parent] },
          { entity: parent, children: [] }
        ]
      })

      const result = pushChild(engine, parent, child)
      const expected = [
        { entity: engine.RootEntity, children: [parent] },
        { entity: parent, children: [child] },
        { entity: child, children: [] }
      ]

      expect(result).toEqual(expected)
    })

    it('should not add a child if it is already in the parent node', () => {
      const parent = engine.addEntity()
      const child = engine.addEntity()
      const value = [
        { entity: engine.RootEntity, children: [parent] },
        { entity: parent, children: [child] },
        { entity: child, children: [] }
      ]
      Nodes.create(engine.RootEntity, { value })

      const result = pushChild(engine, parent, child)

      expect(result).toEqual(value)
    })
  })

  describe('removeChild', () => {
    it('should remove the specified child from the parent node', () => {
      const entity1 = engine.addEntity()
      const childToRemove = engine.addEntity()
      Nodes.create(engine.RootEntity, {
        value: [
          { entity: engine.RootEntity, children: [entity1] },
          { entity: entity1, children: [childToRemove] },
          { entity: childToRemove, children: [] }
        ]
      })

      const result = removeChild(engine, entity1, childToRemove)
      const expected = [
        { entity: engine.RootEntity, children: [entity1] },
        { entity: entity1, children: [] },
        { entity: childToRemove, children: [] }
      ]

      expect(result).toEqual(expected)
    })

    it('should not remove any child if the specified child does not exist in the parent node', () => {
      const entity1 = engine.addEntity()
      const entity2 = engine.addEntity()
      const entity3 = engine.addEntity()
      const value = [
        { entity: engine.RootEntity, children: [entity1, entity3] },
        { entity: entity1, children: [entity2] },
        { entity: entity3, children: [] }
      ]
      Nodes.create(engine.RootEntity, { value })

      const result = removeChild(engine, entity1, entity3)

      expect(result).toEqual(value)
    })
  })

  describe('filterChild', () => {
    it('should return the parent node children without the specified child', () => {
      const parentEntity = engine.addEntity()
      const childEntity1 = engine.addEntity()
      const childEntity2 = engine.addEntity()
      const childEntity3 = engine.addEntity()
      const parentNode = { entity: parentEntity, children: [childEntity1, childEntity2, childEntity3] }
      const childToRemove = childEntity2

      const result = filterChild(parentNode, childToRemove)
      const expected = { entity: parentEntity, children: [childEntity1, childEntity3] }

      expect(result).toEqual(expected)
    })

    it('should return the same children array if the specified child does not exist', () => {
      const parentEntity = engine.addEntity()
      const childEntity1 = engine.addEntity()
      const childEntity2 = engine.addEntity()
      const childEntity3 = engine.addEntity()
      const parentNode = { entity: parentEntity, children: [childEntity1, childEntity2, childEntity3] }
      const childToRemove = engine.addEntity()

      const result = filterChild(parentNode, childToRemove)

      expect(result).toEqual(parentNode)
    })
  })
  describe('getAncestors', () => {
    it('should return an empty set when there are no ancestors', () => {
      const entity = engine.addEntity()
      const entity2 = engine.addEntity()
      Nodes.create(engine.RootEntity, {
        value: [
          { entity: engine.RootEntity, children: [entity] },
          { entity: entity, children: [] },
          { entity: entity2, children: [] }
        ]
      })
      const ancestors = getAncestors(engine, entity2)

      expect(ancestors.size).toBe(0)
    })

    it('should return the correct ancestors', () => {
      const entity1 = engine.addEntity()
      const entity2 = engine.addEntity()
      const entity3 = engine.addEntity()
      Nodes.create(engine.RootEntity, {
        value: [
          { entity: engine.RootEntity, children: [entity1] },
          { entity: entity1, children: [entity2, entity3] },
          { entity: entity2, children: [] },
          { entity: entity3, children: [] }
        ]
      })

      const ancestors = getAncestors(engine, entity2)

      expect(ancestors.size).toBe(2)
      expect(ancestors.has(entity1)).toBe(true)
      expect(ancestors.has(engine.RootEntity)).toBe(true)
    })

    it('should return an empty set when the entity does not exist', () => {
      const entity1 = engine.addEntity()
      const entity2 = engine.addEntity()
      const entity3 = engine.addEntity()
      Nodes.create(engine.RootEntity, {
        value: [
          { entity: engine.RootEntity, children: [entity1] },
          { entity: entity1, children: [entity2, entity3] },
          { entity: entity2, children: [] },
          { entity: entity3, children: [] }
        ]
      })

      const ancestors = getAncestors(engine, engine.addEntity())

      expect(ancestors.size).toBe(0)
    })
  })

  describe('isAncestor', () => {
    it('should return true when the entity is an ancestor', () => {
      const entity1 = engine.addEntity()
      const entity2 = engine.addEntity()
      const entity3 = engine.addEntity()
      const ancestors = new Set([entity1, entity2, entity3])

      const result = isAncestor(ancestors, entity2)

      expect(result).toBe(true)
    })

    it('should return false when the entity is not an ancestor', () => {
      const entity1 = engine.addEntity()
      const entity2 = engine.addEntity()
      const entity3 = engine.addEntity()
      const ancestors = new Set([entity1, entity3])

      const result = isAncestor(ancestors, entity2)

      expect(result).toBe(false)
    })
  })

  describe('mapNodes', () => {
    it('should map nodes using the provided function', () => {
      const entity1 = engine.addEntity()
      const entity2 = engine.addEntity()
      const entity3 = engine.addEntity()
      Nodes.create(engine.RootEntity, {
        value: [
          { entity: engine.RootEntity, children: [entity1] },
          { entity: entity1, children: [entity2, entity3] },
          { entity: entity2, children: [] },
          { entity: entity3, children: [] }
        ]
      })

      const mappedNodes = mapNodes(engine, (node) => ({ ...node, open: true }))

      expect(mappedNodes.length).toBe(4)
      expect(mappedNodes[0]).toEqual({ entity: engine.RootEntity, children: [entity1], open: true })
      expect(mappedNodes[1]).toEqual({ entity: entity1, children: [entity2, entity3], open: true })
      expect(mappedNodes[2]).toEqual({ entity: entity2, children: [], open: true })
      expect(mappedNodes[3]).toEqual({ entity: entity3, children: [], open: true })
    })
  })
})
