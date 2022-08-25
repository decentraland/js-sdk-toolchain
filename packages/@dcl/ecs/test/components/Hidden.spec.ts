import { Engine } from '../../src/engine'

describe('Generated Hidden ProtoBuf', () => {
  it('should serialize/deserialize BoxShape', () => {
    const newEngine = Engine()
    const { Hidden } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _shape = Hidden.create(entity)

    Hidden.create(entityB)
    const buffer = Hidden.toBinary(entity)
    Hidden.updateFromBinary(entityB, buffer)

    expect(_shape).toBeDeepCloseTo({ ...Hidden.getMutable(entityB) })

    expect(Hidden.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...Hidden.getMutable(entity)
    })
  })
})
