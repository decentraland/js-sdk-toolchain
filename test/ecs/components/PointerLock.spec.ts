import { Engine, components } from '../../../packages/@dcl/ecs/src'

describe('Generated PointerLock ProtoBuf', () => {
  it('should serialize/deserialize PointerLock', () => {
    const newEngine = Engine()
    const PointerLock = components.PointerLock(newEngine)
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _pointerLock = PointerLock.create(entity, {
      isPointerLocked: true
    })

    PointerLock.create(entityB, {
      isPointerLocked: false
    })
    const buffer = PointerLock.toBinary(entity)
    PointerLock.upsertFromBinary(entityB, buffer)

    expect(_pointerLock).toBeDeepCloseTo({
      ...PointerLock.getMutable(entityB)
    })

    expect(PointerLock.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...PointerLock.getMutable(entity)
    })
  })
})
