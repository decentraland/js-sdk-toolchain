import { Engine, Entity, IEngine } from '@dcl/ecs'
import { EditorComponents, createEditorComponents } from './components'
import { getEmptyTree, getTreeFromEngine, ROOT } from './tree'

describe('getTreeFromEngine', () => {
  let engine: IEngine
  let EntityNode: EditorComponents['EntityNode']

  function add(parent?: Entity) {
    const entity = engine.addEntity()
    EntityNode.create(entity, { label: '', parent: parent ?? ROOT })
    return entity
  }

  function setParent(entity: Entity, newParent: Entity) {
    EntityNode.createOrReplace(entity, { label: '', parent: newParent })
    return entity
  }

  function remove(entity: Entity) {
    engine.removeEntity(entity)
  }

  beforeEach(() => {
    engine = Engine()
    EntityNode = createEditorComponents(engine).EntityNode
  })
  describe('when getting a tree from an empty engine', () => {
    it('should return an empty tree', () => {
      expect(getTreeFromEngine(engine, EntityNode)).toEqual(getEmptyTree())
    })
  })
  describe('when getting a tree from an engine with two sibling entities A and B', () => {
    let A: Entity
    let B: Entity
    beforeEach(() => {
      A = add()
      B = add()
    })
    it('should return a tree with entities A and B as children of ROOT', () => {
      const tree = getTreeFromEngine(engine, EntityNode)
      /**
       * ROOT
       * ├─> A
       * └─> B
       */
      expect(tree.get(ROOT)).toEqual(new Set([A, B]))
    })
  })
  describe('when getting a tree from an engine with two nested entities A and B', () => {
    let A: Entity
    let B: Entity
    beforeEach(() => {
      A = add()
      B = add(A)
    })
    it('should return a tree with entity A as children of ROOT, and B as children of A', () => {
      const tree = getTreeFromEngine(engine, EntityNode)
      /**
       * ROOT
       * ├─> A
       *     └─> B
       */
      expect(tree.get(ROOT)).toEqual(new Set([A]))
      expect(tree.get(A)).toEqual(new Set([B]))
    })
    describe('and then adding a third entity as sibling of A', () => {
      let C: Entity
      beforeEach(() => {
        C = add()
      })
      it('should return a tree with entities A and C as children of ROOT, and B as child of A', () => {
        const tree = getTreeFromEngine(engine, EntityNode)
        /**
         * ROOT
         * ├─> A
         * │   └─> B
         * └─> C
         */
        expect(tree.get(ROOT)).toEqual(new Set([A, C]))
        expect(tree.get(A)).toEqual(new Set([B]))
      })
      describe('and then reparenting C as children of A', () => {
        beforeEach(() => {
          setParent(C, A)
        })
        it('should return a tree with entity A as children of ROOT, and entities B and C as children of A', () => {
          const tree = getTreeFromEngine(engine, EntityNode)
          /**
           * ROOT
           * └─> A
           *     ├─> B
           *     └─> C
           */
          expect(tree.get(ROOT)).toEqual(new Set([A]))
          expect(tree.get(A)).toEqual(new Set([B, C]))
        })
      })
      describe('and then reparenting C as children of B', () => {
        beforeEach(() => {
          setParent(C, B)
        })
        it('should return a tree with entity A as children of ROOT, entity B as children of A, and entity C as children of B', () => {
          const tree = getTreeFromEngine(engine, EntityNode)
          /**
           * ROOT
           * └─> A
           *     └─> B
           *         └─> C
           */
          expect(tree.get(ROOT)).toEqual(new Set([A]))
          expect(tree.get(A)).toEqual(new Set([B]))
          expect(tree.get(B)).toEqual(new Set([C]))
        })
        describe('and then removing entity A', () => {
          beforeEach(() => {
            remove(A)
          })
          it('should return a tree with entity B as children of ROOT because A does not exist, and entity C as children of B', () => {
            const tree = getTreeFromEngine(engine, EntityNode)
            /**
             * ROOT
             * └─> B
             *     └─> C
             */
            expect(tree.get(ROOT)).toEqual(new Set([B]))
            expect(tree.get(B)).toEqual(new Set([C]))
          })
          describe('and then adding a new entity D as children of C', () => {
            let D: Entity
            beforeEach(() => {
              D = add(C)
            })
            it('should return a tree with entity B as children of ROOT, entity C as children of B, and entity D as children of C', () => {
              const tree = getTreeFromEngine(engine, EntityNode)
              /**
               * ROOT
               * └─> B
               *     └─> C
               *         └─> D
               */
              expect(tree.get(ROOT)).toEqual(new Set([B]))
              expect(tree.get(B)).toEqual(new Set([C]))
              expect(tree.get(C)).toEqual(new Set([D]))
            })
            describe('and then reparenting B as children of D, thus creating a cycle', () => {
              beforeEach(() => {
                setParent(B, D)
              })
              it("should return a tree with entity B as children of ROOT (because it can't create a cycle), entity C as children of B, and entity D as children of C", () => {
                const tree = getTreeFromEngine(engine, EntityNode)
                /**
                 * ROOT
                 * └─> B (stays in the same place because it can't create a cycle)
                 *     └─> C
                 *         └─> D
                 */
                expect(tree.get(ROOT)).toEqual(new Set([B]))
                expect(tree.get(B)).toEqual(new Set([C]))
                expect(tree.get(C)).toEqual(new Set([D]))
              })
              describe('and then reparenting D as children of ROOT, thus breaking the cycle', () => {
                beforeEach(() => {
                  setParent(D, ROOT)
                })
                it('should return a tree with entity D as children of ROOT, entity B as children of D, and entity C as children of B', () => {
                  const tree = getTreeFromEngine(engine, EntityNode)
                  /**
                   * ROOT
                   * └─> D
                   *     └─> B (was reparenterd because now it does not create a cylce)
                   *         └─> C
                   */
                  expect(tree.get(ROOT)).toEqual(new Set([D]))
                  expect(tree.get(D)).toEqual(new Set([B]))
                  expect(tree.get(B)).toEqual(new Set([C]))
                })
              })
            })
          })
        })
      })
    })
  })
})
