import { Engine } from '../../src/engine'

describe('Generated Material ProtoBuf', () => {
  it('should serialize/deserialize Material', () => {
    const newEngine = Engine()
    const { Material } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _material = Material.create(entity, {
      ...Material.default(),
      texture: { wrapMode: undefined, filterMode: undefined, src: 'not-casla' }
    })

    Material.create(entityB, {
      albedoColor: { r: 0, g: 1, b: 1 }
    })
    const buffer = Material.toBinary(entity)
    Material.updateFromBinary(entityB, buffer)

    const m = Material.getMutable(entityB)
    expect(_material).toBeDeepCloseTo(m as any)

    expect(Material.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...Material.getMutable(entity)
    } as any)
  })
})
