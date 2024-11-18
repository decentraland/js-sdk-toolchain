import { Engine, Entity, IEngine, components } from '../../../packages/@dcl/ecs/src'
import { TRANSFORM_LENGTH } from '../../../packages/@dcl/ecs/src/components/manual/TransformSchema'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { Quaternion, Vector3 } from '../../../packages/@dcl/sdk/src/math'
import { testComponentSerialization } from './assertion'

function createTree(
  engine: IEngine,
  initialPosition: Vector3 = Vector3.Zero(),
  initialScale: Vector3 = Vector3.One(),
  initialRotation: Quaternion = Quaternion.Identity()
) {
  const Transform = components.Transform(engine)

  function createTransform(
    parent: Entity | undefined,
    position: Vector3,
    scale: Vector3,
    rotation: Quaternion
  ): Entity {
    const entity = engine.addEntity()

    Transform.create(entity, {
      position,
      scale,
      rotation,
      parent
    })
    return entity
  }

  const treeRoot = createTransform(undefined, initialPosition, initialScale, initialRotation)
  const entityA = createTransform(treeRoot, initialPosition, initialScale, initialRotation)
  const entityB = createTransform(entityA, initialPosition, initialScale, initialRotation)
  const entityC = createTransform(entityB, initialPosition, initialScale, initialRotation)
  const entityD = createTransform(entityC, initialPosition, initialScale, initialRotation)

  const transforms = {
    treeRoot: Transform.getMutable(treeRoot),
    entityA: Transform.getMutable(entityA),
    entityB: Transform.getMutable(entityB),
    entityC: Transform.getMutable(entityC),
    entityD: Transform.getMutable(entityD)
  }

  return {
    ...transforms,
    transforms: Object.values(transforms)
  }
}

describe('Transform component', () => {
  it('should transform length 44 bytes ', () => {
    expect(TRANSFORM_LENGTH).toBe(44)
  })

  it('should serialize Transform with 44 bytes', () => {
    const newEngine = Engine()
    const Transform = components.Transform(newEngine)

    const buffer = new ReadWriteByteBuffer()
    Transform.schema.serialize(
      {
        position: Vector3.create(Math.PI, Math.LN10, Math.SQRT1_2),
        rotation: Quaternion.create(Math.PI, Math.E, 0.0, Math.SQRT1_2),
        scale: Vector3.create(Math.PI, Math.E, Math.LN10),
        parent: 123456789 as Entity
      },
      buffer
    )

    expect(Array.from(buffer.toBinary())).toStrictEqual([
      219, 15, 73, 64, 142, 93, 19, 64, 243, 4, 53, 63, 219, 15, 73, 64, 84, 248, 45, 64, 0, 0, 0, 0, 243, 4, 53, 63,
      219, 15, 73, 64, 84, 248, 45, 64, 142, 93, 19, 64, 21, 205, 91, 7
    ])
    expect(buffer.toBinary().length).toBe(TRANSFORM_LENGTH)
  })

  it('should serialize/deserialize Transform', () => {
    const newEngine = Engine()
    const Transform = components.Transform(newEngine)

    testComponentSerialization(Transform, {
      position: Vector3.create(Math.PI, Math.LN10, Math.SQRT1_2),
      rotation: Quaternion.create(Math.PI, Math.E, 0.0, Math.SQRT1_2),
      scale: Vector3.create(Math.PI, Math.E, Math.LN10),
      parent: 123456789 as Entity
    })

    testComponentSerialization(Transform, {
      position: Vector3.One(),
      rotation: Quaternion.Identity(),
      scale: Vector3.Zero(),
      parent: 3333 as Entity
    })
  })

  it('should serialize/deserialize Transform without parent', () => {
    const newEngine = Engine()
    const Transform = components.Transform(newEngine)

    testComponentSerialization(Transform, {
      position: Vector3.create(Math.PI, Math.LN10, Math.SQRT1_2),
      rotation: Quaternion.create(Math.PI, Math.E, 0.0, Math.SQRT1_2),
      scale: Vector3.create(Math.PI, Math.E, Math.LN10)
    })

    testComponentSerialization(Transform, {
      position: Vector3.One(),
      rotation: Quaternion.Identity(),
      scale: Vector3.Zero(),
      parent: 3333 as Entity
    })
  })

  it('should create a valid empty transform component if no value argument is passed', () => {
    const newEngine = Engine()
    const Transform = components.Transform(newEngine)
    const entity = newEngine.addEntity()

    const t1 = Transform.create(entity)

    expect(t1).toEqual({
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      parent: 0 as Entity
    })

    // check without explicit parent
    t1.parent = undefined
    expect(t1.globalPosition).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('should create a valid transform component with default values if partial values are provided', () => {
    const newEngine = Engine()
    const Transform = components.Transform(newEngine)
    const entity = newEngine.addEntity()

    const t1 = Transform.create(entity, { position: { x: 1, y: 1, z: 1 } })

    expect(t1).toEqual({
      position: { x: 1, y: 1, z: 1 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      parent: 0 as Entity
    })
  })

  it('should create a valid empty transform component if no value argument is passed in getOrCreate', () => {
    const newEngine = Engine()
    const Transform = components.Transform(newEngine)
    const entity = newEngine.addEntity()

    Transform.create(entity, {
      position: Vector3.One(),
      rotation: Quaternion.Identity(),
      scale: Vector3.Down(),
      parent: 3333 as Entity
    })

    const t1 = Transform.createOrReplace(entity)

    expect(t1).toEqual({
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      parent: 0
    })
  })

  it('should create a tree all globalPosition zero by putting Transform.Identity() in each entity', () => {
    const newEngine = Engine()

    const tree = createTree(newEngine)
    for (const transform of tree.transforms) {
      expect(transform.globalPosition).toEqual(Vector3.Zero())
    }
  })

  it('should set a value globalPosition affecting only the last entity', () => {
    const newEngine = Engine()
    const tree = createTree(newEngine)
    tree.entityD.globalPosition = Vector3.One()
    expect(tree.treeRoot.globalPosition).toEqual(Vector3.Zero())
    expect(tree.entityA.globalPosition).toEqual(Vector3.Zero())
    expect(tree.entityB.globalPosition).toEqual(Vector3.Zero())
    expect(tree.entityC.globalPosition).toEqual(Vector3.Zero())
    expect(tree.entityD.globalPosition).toEqual(Vector3.One())
    expect(tree.entityD.position).toEqual(Vector3.One())
  })

  it('should set/get globalPosition with undefined parents', () => {
    const newEngine = Engine()
    const tree = createTree(newEngine, Vector3.One())
    tree.treeRoot.parent = undefined
    tree.entityC.parent = undefined
    tree.entityD.globalPosition = Vector3.Zero()
    expect(tree.treeRoot.globalPosition).toEqual(Vector3.create(1, 1, 1))
    expect(tree.entityA.globalPosition).toEqual(Vector3.create(2, 2, 2))
    expect(tree.entityB.globalPosition).toEqual(Vector3.create(3, 3, 3))
    expect(tree.entityC.globalPosition).toEqual(Vector3.create(1, 1, 1))
    expect(tree.entityD.globalPosition).toEqual(Vector3.create(0, 0, 0))
    expect(tree.entityD.position).toEqual(Vector3.create(-1, -1, -1))

    tree.entityC.parent = undefined
    tree.entityC.globalPosition = Vector3.Forward()
    expect(tree.entityC.position).toEqual(Vector3.create(0, 0, 1))
  })

  it('should set a recursive (1,1,1) affecting globalPosition', () => {
    const newEngine = Engine()
    const tree = createTree(newEngine, Vector3.One())

    // should be (1,1,1), (2,2,2) and so on
    for (const [index, transform] of tree.transforms.entries()) {
      expect(transform.globalPosition).toEqual(Vector3.create(1 + index, 1 + index, 1 + index))
    }
  })

  it('should log error a if there is a cyclic parenting', () => {
    const errorFunc = jest.spyOn(console, 'error')
    const errorString = (e: Entity) => 'There is a cyclic parent with entity ' + e

    const newEngine = Engine()
    const tree = createTree(newEngine)

    tree.treeRoot.parent = tree.entityD.parent
    const _globalPositionD = tree.entityD.globalPosition
    expect(errorFunc).toBeCalledWith(errorString(tree.entityD.parent!))
  })

  it('should still get&set globalPosition with scale zero or negative', () => {
    const newEngine = Engine()
    const tree = createTree(newEngine, Vector3.One())
    tree.treeRoot.position = Vector3.Zero()

    tree.treeRoot.scale = Vector3.Zero()
    expect(tree.entityD.globalPosition).toEqual(Vector3.Zero())

    tree.treeRoot.scale = Vector3.Down()
    expect(tree.entityD.globalPosition).toEqual(Vector3.create(0, -4, 0))

    // it should be impossible having a zero scale
    tree.entityD.globalPosition = Vector3.One()
    // it doesn't assign anything
    expect(tree.entityD.globalPosition).toEqual(Vector3.create(0, -4, 0))
  })

  it('should still get&set globalPosition with rotation zero or negative', () => {
    const newEngine = Engine()
    const tree = createTree(newEngine, Vector3.One())

    tree.treeRoot.rotation = Quaternion.Identity()
    expect(tree.entityD.globalPosition).toEqual(Vector3.create(5, 5, 5))

    tree.treeRoot.rotation = Quaternion.create(0, 0, 0, -1)
    expect(tree.entityD.globalPosition).toEqual(Vector3.create(5, 5, 5))

    tree.treeRoot.rotation = Quaternion.create(0, 0, 0, 0)
    expect(tree.entityD.globalPosition).toEqual(Vector3.create(1, 1, 1))
  })

  describe('should return mutable obj if use Transform.getOrCreateMutable()', () => {
    const newEngine = Engine()
    const Transform = components.Transform(newEngine)

    it('with existing component', async () => {
      const entity = newEngine.addEntity()
      Transform.create(entity, { position: Vector3.Down() })
      expect(Transform.getOrCreateMutable(entity)).toEqual({
        position: Vector3.Down(),
        scale: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        parent: 0
      })
    })

    it('with non-existing component', async () => {
      const entity = newEngine.addEntity()
      expect(Transform.getOrCreateMutable(entity, { position: Vector3.Up() })).toEqual({
        position: Vector3.Up(),
        scale: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        parent: 0
      })
    })
  })

  it('should return mutable obj or null if use Transform.getMutableOrNull()', async () => {
    const newEngine = Engine()
    const Transform = components.Transform(newEngine)
    const entityWithTransform = newEngine.addEntity()
    const entityWithoutTransform = newEngine.addEntity()

    Transform.getOrCreateMutable(entityWithTransform).position.x = 8888
    expect(Transform.getMutableOrNull(entityWithTransform)?.position.x).toStrictEqual(8888)
    expect(Transform.getMutableOrNull(entityWithoutTransform)).toStrictEqual(null)
  })
})
