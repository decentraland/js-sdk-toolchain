import { ensureEngineAndComponents } from './utils'

describe('Generated Cylinder ProtoBuf', () => {
  it('should serialize/deserialize BoxShape', async () => {
    const {
      engine: newEngine,
      components: { CylinderShape }
    } = await ensureEngineAndComponents()

    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _shape = CylinderShape.create(entity, {
      isPointerBlocker: true,
      visible: true,
      withCollisions: true,
      radiusTop: 1,
      radiusBottom: 1
    })

    CylinderShape.create(entityB, {
      isPointerBlocker: false,
      visible: false,
      withCollisions: false,
      radiusTop: 0,
      radiusBottom: 0
    })
    const buffer = CylinderShape.toBinary(entity)
    CylinderShape.updateFromBinary(entityB, buffer)

    expect(_shape).toBeDeepCloseTo({ ...CylinderShape.mutable(entityB) })

    expect(CylinderShape.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...CylinderShape.mutable(entity)
    })
  })
})
