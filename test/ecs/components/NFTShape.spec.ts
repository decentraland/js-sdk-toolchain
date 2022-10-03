import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated NFTShape ProtoBuf', () => {
  it('should serialize/deserialize NFTShape', () => {
    const newEngine = Engine()
    const { NFTShape } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _nftShape = NFTShape.create(entity, {
      color: { r: 1, g: 1, b: 1 },
      src: 'testSrc',
      style: 5
    })

    NFTShape.create(entityB, {
      color: { r: 0, g: 0, b: 0 },
      src: 'NotestSrc',
      style: 2
    })
    const buffer = NFTShape.toBinary(entity)
    NFTShape.updateFromBinary(entityB, buffer)

    expect(_nftShape).toBeDeepCloseTo({ ...NFTShape.get(entityB) })
    expect(NFTShape.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...NFTShape.get(entity)
    })
  })
})
