import { Engine } from '../../src/engine'

describe('Generated BoxShape ProtoBuf', () => {
  it('should serialize/deserialize BoxShape', () => {
    const newEngine = Engine()
    const { GLTFShape } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _shape = GLTFShape.create(entity, {
      isPointerBlocker: true,
      visible: true,
      withCollisions: true,
      src: 'test/src'
    })

    GLTFShape.create(entityB, {
      isPointerBlocker: false,
      visible: false,
      withCollisions: false,
      src: 'test/sr23sc c'
    })
    const buffer = GLTFShape.toBinary(entity)
    GLTFShape.updateFromBinary(entityB, buffer)

    expect(_shape).toBeDeepCloseTo({ ...GLTFShape.getMutable(entityB) })

    expect(GLTFShape.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...GLTFShape.getMutable(entity)
    })
  })
})
