import { Engine, Entity, IEngine, getComponentEntityTree } from '@dcl/ecs'
import { ActionType, ComponentName, TriggerType } from '@dcl/asset-packs'

import { EditorComponents, SdkComponents, createComponents, createEditorComponents } from './components'
import { getEmptyTree, getTreeFromEngine, ROOT } from './tree'
import { createOperations } from './operations'

describe('getTreeFromEngine', () => {
  let engine: IEngine
  let Transform: SdkComponents['Transform']
  let Nodes: EditorComponents['Nodes']
  let operations: ReturnType<typeof createOperations>

  function getTreeEntitiesList(entity: Entity) {
    return Array.from(getComponentEntityTree(engine, entity, Transform))
  }

  beforeEach(() => {
    engine = Engine()
    Transform = createComponents(engine).Transform
    Nodes = createEditorComponents(engine).Nodes
    Nodes.create(ROOT, { value: [{ entity: ROOT, children: [] }] })
    operations = createOperations(engine)
  })
  describe('when getting a tree from an empty engine', () => {
    it('should return an empty tree', () => {
      expect(getTreeFromEngine(engine, Nodes)).toEqual(getEmptyTree())
    })
  })
  describe('when getting a tree from an engine with two sibling entities A and B', () => {
    let A: Entity
    let B: Entity
    beforeEach(() => {
      A = operations.addChild(ROOT, 'A')
      B = operations.addChild(ROOT, 'B')
    })
    it('should return a tree with entities A and B as children of ROOT', () => {
      const tree = getTreeFromEngine(engine, Nodes)
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
      A = operations.addChild(ROOT, 'A')
      B = operations.addChild(A, 'B')
    })
    it('should return a tree with entity A as children of ROOT, and B as children of A', () => {
      const tree = getTreeFromEngine(engine, Nodes)
      /**
       * ROOT
       * ├─> A
       *     └─> B
       */
      expect(tree.get(ROOT)).toEqual(new Set([A]))
      expect(tree.get(A)).toEqual(new Set([B]))
      expect(getTreeEntitiesList(A)).toEqual(expect.arrayContaining([A, B]))
    })
    describe('and then adding a third entity as sibling of A', () => {
      let C: Entity
      beforeEach(() => {
        C = operations.addChild(ROOT, 'C')
      })
      it('should return a tree with entities A and C as children of ROOT, and B as child of A', () => {
        const tree = getTreeFromEngine(engine, Nodes)
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
          operations.setParent(C, A)
        })
        it('should return a tree with entity A as children of ROOT, and entities B and C as children of A', () => {
          const tree = getTreeFromEngine(engine, Nodes)
          console.log(Nodes.get(ROOT).value)
          console.log(tree)
          /**
           * ROOT
           * └─> A
           *     ├─> B
           *     └─> C
           */
          expect(tree.get(ROOT)).toEqual(new Set([A]))
          expect(tree.get(A)).toEqual(new Set([B, C]))
          expect(getTreeEntitiesList(A)).toEqual(expect.arrayContaining([A, B, C]))
        })
      })
      describe('and then reparenting C as children of B', () => {
        beforeEach(() => {
          operations.setParent(C, B)
        })
        it('should return a tree with entity A as children of ROOT, entity B as children of A, and entity C as children of B', () => {
          const tree = getTreeFromEngine(engine, Nodes)
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
            operations.removeEntity(A)
          })
          it('should return a empty tree since A was the parent of all the other entities', () => {
            const tree = getTreeFromEngine(engine, Nodes)
            /**
             * ROOT
             * └─> ?
             */
            expect(tree.get(ROOT)).toEqual(new Set([]))
            expect(tree.get(A)).not.toBeDefined()
            expect(tree.get(B)).not.toBeDefined()
            expect(tree.get(C)).not.toBeDefined()
            expect(tree.size).toBe(3)
          })
          describe('and then adding a new entity D as children of ROOT', () => {
            let D: Entity
            beforeEach(() => {
              D = operations.addChild(ROOT, 'D')
            })
            it('should return a tree with entity D as children of ROOT', () => {
              const tree = getTreeFromEngine(engine, Nodes)
              /**
               * ROOT
               * └─> D
               */
              expect(tree.get(ROOT)).toEqual(new Set([D]))
            })
            describe('and then reparenting B as children of D', () => {
              beforeEach(() => {
                operations.setParent(B, D)
              })
              it('should return a tree with entity B as children of D, and entity D as children of ROOT', () => {
                const tree = getTreeFromEngine(engine, Nodes)
                /**
                 * ROOT
                 * └─> D
                 *     └─> B
                 */
                expect(tree.get(ROOT)).toEqual(new Set([D]))
                expect(tree.get(D)).toEqual(new Set([B]))
              })
            })
          })
        })
      })
    })
  })
  describe('when getting a tree from an engine with an entity with an Action component', () => {
    let A: Entity
    beforeEach(() => {
      A = operations.addChild(ROOT, 'A', {
        [ComponentName.ACTIONS]: {
          value: [
            {
              name: 'Open',
              type: ActionType.PLAY_ANIMATION,
              animation: 'Open'
            }
          ]
        }
      })
    })
    it('should return a tree with entity A with an Action component as children of ROOT', () => {
      const tree = getTreeFromEngine(engine, Nodes)
      /**
       * ROOT
       * └─> A
       */
      expect(tree.get(ROOT)).toEqual(new Set([A]))
    })
  })
  describe('when getting a tree from an engine with an entity with an Trigger component', () => {
    let A: Entity
    beforeEach(() => {
      A = operations.addChild(ROOT, 'A', {
        [ComponentName.TRIGGERS]: {
          value: [
            {
              type: TriggerType.ON_CLICK,
              actions: [
                {
                  entity: '{selfEntity}' as any,
                  name: 'Open'
                }
              ]
            },
            {
              type: TriggerType.ON_CLICK,
              actions: [
                {
                  entity: ROOT as Entity,
                  name: 'Open'
                }
              ]
            }
          ]
        }
      })
    })
    it('should return a tree with entity A with an Trigger component as children of ROOT', () => {
      const tree = getTreeFromEngine(engine, Nodes)
      /**
       * ROOT
       * └─> A
       */
      expect(tree.get(ROOT)).toEqual(new Set([A]))
    })
  })
})
