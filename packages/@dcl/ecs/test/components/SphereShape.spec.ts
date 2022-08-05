import { ensureEngineAndComponents } from './utils'

describe('Generated SphereShape ProtoBuf', () => {
  it('should serialize/deserialize BoxShape', async () => {
    const {
      engine: newEngine,
      components: { SphereShape }
    } = await ensureEngineAndComponents()

    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _sphereShape = SphereShape.create(entity, {
      isPointerBlocker: true,
      visible: true,
      withCollisions: true
    })

    SphereShape.create(entityB, {
      isPointerBlocker: false,
      visible: false,
      withCollisions: false
    })
    const buffer = SphereShape.toBinary(entity)
    SphereShape.updateFromBinary(entityB, buffer)

    expect(_sphereShape).toBeDeepCloseTo({ ...SphereShape.mutable(entityB) })
    expect(SphereShape.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...SphereShape.mutable(entity)
    })
  })
})
