import { Engine } from '../../src/engine'

describe('Generated MeshRenderer ProtoBuf', () => {
  it('should serialize/deserialize MeshRenderer', () => {
    const newEngine = Engine()
    const { MeshRenderer } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _meshRenderer = MeshRenderer.create(entity, {
      box: { uvs: [0, 1, 0, 0] },
      sphere: undefined,
      cylinder: { radiusBottom: 1, radiusTop: 2 },
      plane: undefined
    })

    MeshRenderer.create(entityB, {
      sphere: {},
      box: undefined,
      cylinder: undefined,
      plane: { uvs: [1, 1, 1, 1] }
    })
    const buffer = MeshRenderer.toBinary(entity)
    MeshRenderer.updateFromBinary(entityB, buffer)

    expect(_meshRenderer).toBeDeepCloseTo({
      ...MeshRenderer.getMutable(entityB)
    } as any)

    expect(MeshRenderer.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...MeshRenderer.getMutable(entity)
    } as any)
  })

  it('should create a Mesh with default constructor (a prefilled undefined)', () => {
    const newEngine = Engine()
    const { MeshRenderer } = newEngine.baseComponents
    const entity = newEngine.addEntity()

    const meshRenderer = MeshRenderer.create(entity, {
      box: { uvs: [] }
    })
    expect(meshRenderer.box).toStrictEqual({ uvs: [] })
  })
})
