import { Engine } from '../../src/engine'

describe('Generated NFTShape ProtoBuf', () => {
  it('should serialize/deserialize NFTShape', () => {
    const newEngine = Engine()
    const { NFTShape } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _nftShape = NFTShape.create(entity, {
      isPointerBlocker: true,
      visible: true,
      withCollisions: true,
      color: { r: 1, g: 1, b: 1 },
      src: 'testSrc',
      assetId: 'asset',
      style: 5
    })

    NFTShape.create(entityB, {
      isPointerBlocker: false,
      visible: false,
      withCollisions: false,
      color: { r: 0, g: 0, b: 0 },
      src: 'NotestSrc',
      assetId: 'Noasset',
      style: 2
    })
    const buffer = NFTShape.toBinary(entity)
    NFTShape.updateFromBinary(entityB, buffer)

    expect(_nftShape).toBeDeepCloseTo({ ...NFTShape.getFrom(entityB) })
    expect(NFTShape.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...NFTShape.getFrom(entity)
    })
  })
})
