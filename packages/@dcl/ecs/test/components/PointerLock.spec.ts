import { Engine } from '../../src/engine'

describe('Generated PointerLock ProtoBuf', () => {
  it('should serialize/deserialize PointerLock', () => {
    const newEngine = Engine()
    const { PointerLock } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _pointerLock = PointerLock.create(entity, {
      isPointerLocked: true
    })

    PointerLock.create(entityB, {
      isPointerLocked: false
    })
    const buffer = PointerLock.toBinary(entity)
    PointerLock.updateFromBinary(entityB, buffer)

    expect(_pointerLock).toBeDeepCloseTo({
      ...PointerLock.getModifiable(entityB)
    })

    expect(PointerLock.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...PointerLock.getModifiable(entity)
    })
  })
})
