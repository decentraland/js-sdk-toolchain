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
      color: { red:1, green:1, blue:1 },
      src: 'testSrc',
      asset_id: 'asset',
      style: 5
    })

    NFTShape.create(entityB, {
      isPointerBlocker: false,
      visible: false,
      withCollisions: false,
      color: { red:0, green:0, blue:0 },
      src: 'NotestSrc',
      asset_id: 'Noasset',
      style: 2
    })
    const buffer = NFTShape.toBinary(entity)
    NFTShape.updateFromBinary(entityB, buffer)

    expect(_nftShape).toBeDeepCloseTo({ ...NFTShape.mutable(entityB) })
  })
})
