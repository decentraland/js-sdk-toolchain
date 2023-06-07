import { Engine, Entity, IEngine } from '@dcl/ecs'
import { EditorComponents, SdkComponents, createComponents, createEditorComponents } from './components'
import { ROOT } from './tree'

describe.skip('getTransformNodeChecker', () => {
  let engine: IEngine
  let EntityNode: EditorComponents['EntityNode']
  let Transform: SdkComponents['Transform']

  const dt = CheckIntervalSeconds

  function add(parent?: Entity) {
    const entity = engine.addEntity()
    EntityNode.create(entity, { label: '', parent: parent ?? ROOT })
    return entity
  }

  function remove(entity: Entity) {
    engine.removeEntity(entity)
  }

  async function updateEngine(withSystemRun: boolean = true) {
    await engine.update(withSystemRun ? 2 * dt : 0.0)
  }

  beforeEach(() => {
    engine = Engine()
    EntityNode = createEditorComponents(engine).EntityNode
    Transform = createComponents(engine).Transform
    engine.addSystem(getTransformNodeChecker(engine, EntityNode))
  })

  describe('when getting a transform WITHOUT parent possible', () => {
    it('should parent the transform to ROOT', async () => {
      const entityA = add()
      const entityB = add(entityA)
      Transform.createOrReplace(entityB)

      await updateEngine()

      expect(Transform.get(entityB).parent).toBe(ROOT)
    })
  })

  describe('when getting a transform WITH a parent possible', () => {
    it('should parent the transform to the EntityA', async () => {
      const entityA = add()
      const entityB = add(entityA)
      Transform.createOrReplace(entityB)
      Transform.createOrReplace(entityA)
      await updateEngine()
      expect(Transform.get(entityB).parent).toBe(entityA)
    })

    it('should skip parenting the transform to the EntityA because of the DT<1.0seconds', async () => {
      const entityA = add()
      const entityB = add(entityA)
      Transform.createOrReplace(entityB)
      Transform.createOrReplace(entityA)
      await updateEngine(false)
      expect(Transform.get(entityB).parent).not.toBe(entityA)
    })
  })

  describe('when getting a transform WITH orphan parent', () => {
    it('should parent the transform to the ROOT', async () => {
      const entityA = add()
      const entityB = add(entityA)
      Transform.createOrReplace(entityB)
      remove(entityA)
      await updateEngine()
      expect(Transform.get(entityB).parent).toBe(ROOT)
    })
  })
})
