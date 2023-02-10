import { Engine, components } from '../../../packages/@dcl/ecs/src'

describe('Generated NftShape ProtoBuf', () => {
  it('should serialize/deserialize NftShape', () => {
    const newEngine = Engine()
    const NftShape = components.NftShape(newEngine)
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _nftShape = NftShape.create(entity, {
      color: { r: 1, g: 1, b: 1 },
      src: 'testSrc',
      style: 5
    })

    NftShape.create(entityB, {
      color: { r: 0, g: 0, b: 0 },
      src: 'NotestSrc',
      style: 2
    })
    const buffer = NftShape.toBinary(entity)
    NftShape.upsertFromBinary(entityB, buffer)

    expect(_nftShape).toBeDeepCloseTo({ ...NftShape.get(entityB) })
    expect(NftShape.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...NftShape.get(entity)
    })
  })
})
