import { ensureEngineAndComponents } from './utils'
describe('Generated PlaneShape ProtoBuf', () => {
  it('should serialize/deserialize BoxShape', async () => {
    const {
      engine: newEngine,
      components: { PlaneShape }
    } = await ensureEngineAndComponents()

    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _planeShape = PlaneShape.create(entity, {
      isPointerBlocker: true,
      visible: true,
      withCollisions: true,
      uvs: [0, 3234.32, 123.2, Math.PI / 2]
    })

    PlaneShape.create(entityB, {
      isPointerBlocker: false,
      visible: false,
      withCollisions: false,
      uvs: [-1, -2.1, 12837127371]
    })
    const buffer = PlaneShape.toBinary(entity)
    PlaneShape.updateFromBinary(entityB, buffer)

    expect(_planeShape).toBeDeepCloseTo({ ...PlaneShape.mutable(entityB) })

    expect(PlaneShape.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...PlaneShape.mutable(entity)
    })
  })
})
