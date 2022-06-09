import { Engine } from '../../src/engine'

describe('Generated BoxShape ProtoBuf', () => {
  it('should serialize/deserialize BoxShape', () => {
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

    // TODO: toBeDeepCloseTo has a error type implementation, should make an own toBeDeepCloseTo
    //  or fix with a PR this one
    const otherNFTShape = NFTShape.mutable(entityB)
    expect(_nftShape).toBeDeepCloseTo({ ...(otherNFTShape as any) })
  })
})
