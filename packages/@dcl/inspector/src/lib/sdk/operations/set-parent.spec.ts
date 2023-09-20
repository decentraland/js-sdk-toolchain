import { IEngine, Engine, TransformComponentExtended } from '@dcl/ecs'
import { Quaternion } from '@dcl/ecs-math'

import { areSRTMatrixesEqualWithEpsilon, getWorldMatrix } from '../../logic/math'
import { CoreComponents, EditorComponents, createEditorComponents } from '../components'
import { setParent } from './set-parent'

const getNodesInitialValue = (engine: IEngine) => ({
  value: [{ entity: engine.RootEntity, children: [] }]
})

describe('setParent', () => {
  let engine: IEngine
  let Transform: TransformComponentExtended
  let Nodes: EditorComponents['Nodes']

  beforeEach(() => {
    engine = Engine()
    Transform = engine.getComponent(CoreComponents.TRANSFORM) as TransformComponentExtended
    Nodes = createEditorComponents(engine).Nodes
    Nodes.create(engine.RootEntity, getNodesInitialValue(engine))
  })
  it('should correctly re-parent an entity and preserve its world matrix', () => {
    const oldParent = engine.addEntity()
    const newParent = engine.addEntity()
    const child = engine.addEntity()

    Nodes.createOrReplace(engine.RootEntity, {
      value: [
        { entity: engine.RootEntity, children: [oldParent] },
        { entity: oldParent, children: [child] },
        { entity: newParent, children: [] }
      ]
    })
    Transform.create(oldParent, { position: { x: 1, y: 1, z: 1 }, scale: { x: 2, y: 2, z: 2 } })
    Transform.create(newParent, {
      position: { x: 10, y: 10, z: 10 },
      rotation: Quaternion.fromEulerDegrees(30, 45, 60)
    })
    Transform.create(child, { parent: oldParent, position: { x: 5, y: 5, z: 5 } })

    const worldMatrixBefore = getWorldMatrix(child, Transform)
    setParent(engine)(child, newParent)
    const worldMatrixAfter = getWorldMatrix(child, Transform)
    const nodesAfter = [
      { entity: engine.RootEntity, children: [oldParent] },
      { entity: oldParent, children: [] },
      { entity: newParent, children: [child] },
      { entity: child, children: [] }
    ]

    expect(Transform.get(child).parent).toBe(newParent)
    expect(areSRTMatrixesEqualWithEpsilon(worldMatrixBefore, worldMatrixAfter)).toBe(true)
    expect(Nodes.get(engine.RootEntity).value).toStrictEqual(nodesAfter)
  })
})
