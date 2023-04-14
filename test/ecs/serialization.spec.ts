import { Engine, Entity } from '../../packages/@dcl/ecs/src/engine'
import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import { jsonSchemaToSchema, mutateValues } from '../../packages/@dcl/ecs/src/schemas/buildSchema'
import { ISchema } from '../../packages/@dcl/ecs/src/schemas/ISchema'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'

const Vector3 = Schemas.Map({
  x: Schemas.Float,
  y: Schemas.Float,
  z: Schemas.Float
})

describe('test schema serialization', () => {
  it('should serialize Ints', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const entityCopied = engine.addEntity()
    const toTest = [Schemas.Short, Schemas.Int, Schemas.Byte]
    let COMPONENT_ID = 888

    for (const t of toTest) {
      const IntegerComponent = engine.defineComponent((COMPONENT_ID++).toString(), { value: t })
      const myInteger = IntegerComponent.create(entity, { value: 33 })
      expect(myInteger.value).toBe(33)

      const buffer = new ReadWriteByteBuffer()
      IntegerComponent.schema.serialize(IntegerComponent.get(entity), buffer)
      const copiedInteger = IntegerComponent.create(entityCopied, { value: 21 })
      expect(copiedInteger.value).toBe(21)
      const updatedInteger = IntegerComponent.schema.deserialize(buffer)
      expect(updatedInteger!.value).toBe(33)

      expect(t.create()).toEqual(0)
    }
  })

  it('should serialize Floats', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const entityCopied = engine.addEntity()
    const toTest = [Schemas.Float, Schemas.Double]
    let COMPONENT_ID = 888
    const testValue = 2.0

    for (const t of toTest) {
      const FloatComponent = engine.defineComponent((COMPONENT_ID++).toString(), { value: t })
      const myFloat = FloatComponent.create(entity, { value: testValue })
      expect(myFloat.value).toBe(testValue)

      const buffer = new ReadWriteByteBuffer()
      FloatComponent.schema.serialize(FloatComponent.get(entity), buffer)
      const copiedFloat = FloatComponent.create(entityCopied, { value: 21.22 })
      expect(copiedFloat.value).toBe(21.22)
      const updatedFloat = FloatComponent.schema.deserialize(buffer)
      expect(updatedFloat!.value).toBe(testValue)
    }

    expect(Vector3.create()).toEqual({ x: 0, y: 0, z: 0 })
    expect(Schemas.Double.create()).toEqual(0.0)
  })

  it('should serialize Strings', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const entityCopied = engine.addEntity()

    let COMPONENT_ID = 888
    const testValue = 'testing an string'

    const FloatComponent = engine.defineComponent((COMPONENT_ID++).toString(), {
      value: Schemas.String
    })
    const myFloat = FloatComponent.create(entity, { value: testValue })
    expect(myFloat.value).toBe(testValue)

    const buffer = new ReadWriteByteBuffer()
    FloatComponent.schema.serialize(FloatComponent.get(entity), buffer)
    const copiedFloat = FloatComponent.create(entityCopied, { value: 'n' })
    expect(copiedFloat.value).toBe('n')
    const updatedFloat = FloatComponent.schema.deserialize(buffer)
    expect(updatedFloat!.value).toBe(testValue)
  })

  it('should serialize Schemas.Maps', () => {
    const engine = Engine()
    const myEntity = engine.addEntity()
    const COMPONENT_ID = 888

    const ItemType = Schemas.Map({
      itemId: Schemas.Int,
      name: Schemas.String,
      enchantingIds: Schemas.Array(
        Schemas.Map({
          itemId: Schemas.Int,
          itemAmount: Schemas.Int,
          description: Schemas.String
        })
      )
    })

    const defaultValue = ItemType.create()

    expect(defaultValue).toEqual({ itemId: 0, name: '', enchantingIds: [] })

    const PlayerComponent = engine.defineComponent(COMPONENT_ID.toString(), {
      name: Schemas.String,
      description: Schemas.String,
      level: Schemas.Int,
      hp: Schemas.Float,
      position: Vector3,
      targets: Schemas.Array(Vector3),
      items: Schemas.Array(ItemType),
      pet: Schemas.OneOf({ cat: Schemas.Entity, dog: Schemas.Entity })
    })

    const defaultPlayer = {
      name: '',
      description: '',
      level: 1,
      hp: 0.0,
      position: { x: 1.0, y: 50.0, z: 50.0 },
      targets: [],
      items: [],
      pet: { $case: 'dog' as const, value: 3146 as Entity }
    }

    const myPlayer = PlayerComponent.create(myEntity, defaultPlayer)

    expect(PlayerComponent.get(myEntity)).toStrictEqual(defaultPlayer)

    myPlayer.hp = 8349.2
    myPlayer.position.x += 1.0
    myPlayer.targets.push({
      x: 1232.3232,
      y: Math.random() * 33,
      z: 8754.32723
    })
    myPlayer.items.push({
      itemId: 1,
      name: 'Manzana roja',
      enchantingIds: []
    })
    myPlayer.items[0]?.enchantingIds.push({
      itemId: 2,
      itemAmount: 10,
      description: 'this is a description to an enchanting item.'
    })
    myPlayer.pet = { $case: 'cat', value: 2019 as Entity }

    const buffer = new ReadWriteByteBuffer()
    PlayerComponent.schema.serialize(PlayerComponent.get(myEntity), buffer)

    const otherEntity = engine.addEntity()

    PlayerComponent.create(otherEntity, defaultPlayer)

    const originalPlayer = PlayerComponent.get(myEntity)
    const modifiedFromBinaryPlayer = PlayerComponent.schema.deserialize(buffer)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(modifiedFromBinaryPlayer).toBeDeepCloseTo(originalPlayer)
  })

  it('should serialize Schemas.Optional & Boolean without value (undefined)', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const COMPONENT_ID = 888

    const definition = Schemas.Map({
      optionalColor: Schemas.Optional(
        Schemas.Map({
          r: Schemas.Float,
          g: Schemas.Float,
          b: Schemas.Float
        })
      ),
      hasAlpha: Schemas.Boolean
    })

    const TestComponent = engine.defineComponentFromSchema(COMPONENT_ID.toString(), definition)

    expect(definition.create()).toEqual({
      optionalColor: undefined,
      hasAlpha: false
    })

    TestComponent.create(entity, {
      hasAlpha: true
    })

    const entity2 = engine.addEntity()
    TestComponent.create(entity2, {
      hasAlpha: false,
      optionalColor: { r: 1, g: 2, b: 3 }
    })

    const buffer = new ReadWriteByteBuffer()
    TestComponent.schema.serialize(TestComponent.get(entity), buffer)
    const value2 = TestComponent.schema.deserialize(buffer)

    expect(value2.hasAlpha).toBe(true)
    expect(value2.optionalColor).toBeUndefined()
  })

  it('should serialize Schemas.Optional & Boolean with value', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const COMPONENT_ID = 888

    const TestComponent = engine.defineComponent(COMPONENT_ID.toString(), {
      optionalColor: Schemas.Optional(Schemas.Boolean),
      visible: Schemas.Optional(Schemas.Boolean),
      notVisible: Schemas.Boolean
    })

    TestComponent.create(entity, { optionalColor: true, notVisible: false })

    const buffer = new ReadWriteByteBuffer()
    TestComponent.schema.serialize(TestComponent.get(entity), buffer)
    expect(buffer.toBinary()).toStrictEqual(new Uint8Array([1, 1, 0, 0]))
    expect(TestComponent.get(entity).optionalColor).toBe(true)

    // Deserialize and update new optional
    const newEntity = engine.addEntity()
    TestComponent.create(newEntity, {
      optionalColor: true,
      visible: true,
      notVisible: false
    })

    {
      const buffer = new ReadWriteByteBuffer()
      TestComponent.schema.serialize(TestComponent.get(newEntity), buffer)
      TestComponent.updateFromCrdt({
        componentId: TestComponent.componentId,
        entityId: entity,
        data: buffer.toBinary(),
        timestamp: 3,
        type: 1
      })
    }

    {
      const buffer = new ReadWriteByteBuffer()
      TestComponent.schema.serialize(TestComponent.get(entity), buffer)
      expect(buffer.toBinary()).toStrictEqual(new Uint8Array([1, 1, 1, 1, 0]))
    }
  })

  it('should serialize Int Schemas.Enums', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const COMPONENT_ID = 888

    enum ColorToNumber {
      Default = 0,
      Red = 2,
      Green = 0x33,
      Pink = 0x1f290323
    }

    const TestComponent = engine.defineComponent(COMPONENT_ID.toString(), {
      testEnum: Schemas.EnumNumber<ColorToNumber>(ColorToNumber, ColorToNumber.Default)
    })

    expect(TestComponent.create(entity)).toStrictEqual({ testEnum: 0 })
    TestComponent.createOrReplace(entity, { testEnum: ColorToNumber.Pink })

    const entity2 = engine.addEntity()
    const initialValue = TestComponent.create(entity2, {
      testEnum: ColorToNumber.Green
    })
    expect(initialValue).toStrictEqual({ testEnum: ColorToNumber.Green })

    const buffer = new ReadWriteByteBuffer()
    TestComponent.schema.serialize(TestComponent.get(entity), buffer)
    const value2 = TestComponent.schema.deserialize(buffer)!
    expect(value2).toStrictEqual({ testEnum: ColorToNumber.Pink })
  })

  it('should serialize String Schemas.Enum', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const COMPONENT_ID = 888

    enum ColorToString {
      Red = '2',
      Green = '0x33',
      Pink = '0x1f290323'
    }

    const TestComponent = engine.defineComponent(COMPONENT_ID.toString(), {
      testEnum: Schemas.EnumString<ColorToString>(ColorToString, ColorToString.Red)
    })

    // the default value is ColorToString.Red
    expect(TestComponent.create(entity)).toStrictEqual({ testEnum: '2' })
    TestComponent.createOrReplace(entity, { testEnum: ColorToString.Pink })

    const entity2 = engine.addEntity()
    const initialValue = TestComponent.create(entity2, {
      testEnum: ColorToString.Green
    })
    expect(initialValue).toStrictEqual({ testEnum: ColorToString.Green })

    const buffer = new ReadWriteByteBuffer()
    TestComponent.schema.serialize(TestComponent.get(entity), buffer)
    const value2 = TestComponent.schema.deserialize(buffer)!
    expect(value2).toStrictEqual({ testEnum: ColorToString.Pink })
  })

  it('should deserialize and serialize component from binary', () => {
    const engine = Engine()
    const entityFilled = engine.addEntity() // 0
    const entityEmpty = engine.addEntity() // 1
    const COMPONENT_ID = 888

    const TestComponentType = engine.defineComponent(COMPONENT_ID.toString(), {
      a: Schemas.Int,
      b: Schemas.Int,
      c: Schemas.Array(Schemas.Int),
      d: Schemas.Int64
    })
    const myComponent = TestComponentType.create(entityFilled, {
      a: 2331,
      b: 10,
      c: [2, 3, 4, 5],
      d: -1
    })

    TestComponentType.create(entityEmpty, {
      a: 0,
      b: 0,
      c: [],
      d: 10
    })

    const buffer = new ReadWriteByteBuffer()
    TestComponentType.schema.serialize(TestComponentType.get(entityFilled), buffer)
    const modifiedComponent = TestComponentType.schema.deserialize(buffer)
    expect(modifiedComponent.a).toBe(myComponent.a)
    expect(modifiedComponent.b).toBe(myComponent.b)
    expect(modifiedComponent.c).toEqual(myComponent.c)
    expect(modifiedComponent.d).toEqual(myComponent.d)
  })

  it('should copy component from binary', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const entityCopied = engine.addEntity()

    let i = 0
    const A = 'abcdefghijkl'
    const vectorType: Record<string, ISchema<number>> = {}
    const objectValues: Record<string, number> = {}
    const zeroObjectValues: Record<string, number> = {}

    for (i = 0; i < A.length; i++) {
      const COMPONENT_ID = 888 + i + 1
      const key = A[i]
      vectorType[key] = Schemas.Int
      objectValues[key] = 50 + i
      zeroObjectValues[key] = 0
      const TestComponentType = engine.defineComponent(COMPONENT_ID.toString(), vectorType)

      TestComponentType.create(entity, objectValues)
      TestComponentType.create(entityCopied, zeroObjectValues)

      const buffer = new ReadWriteByteBuffer()
      TestComponentType.schema.serialize(TestComponentType.get(entity), buffer)
      expect(TestComponentType.schema.deserialize(buffer)).toStrictEqual(TestComponentType.get(entity))
    }
  })

  it('should prefill with default value', () => {
    const engine = Engine()
    const entityWithDefault = engine.addEntity() // 0
    const entityWithDefault2 = engine.addEntity()
    const entityEmpty = engine.addEntity() // 1
    const COMPONENT_ID = 888

    const TestComponentType = engine.defineComponent(
      COMPONENT_ID.toString(),
      {
        a: Schemas.Int,
        b: Schemas.Int,
        c: Schemas.Array(Schemas.Int),
        d: Schemas.Int64
      },
      {
        a: 123,
        b: 123,
        c: [11, 22, 33],
        d: 12
      }
    )

    TestComponentType.create(entityEmpty, {
      a: 0,
      b: 0
    })

    TestComponentType.create(entityWithDefault)

    TestComponentType.createOrReplace(entityWithDefault2)

    expect(TestComponentType.get(entityEmpty)).toStrictEqual({
      a: 0,
      b: 0,
      c: [11, 22, 33],
      d: 12
    })

    expect(TestComponentType.get(entityWithDefault)).toStrictEqual({
      a: 123,
      b: 123,
      c: [11, 22, 33],
      d: 12
    })

    expect(TestComponentType.get(entityWithDefault2)).toStrictEqual({
      a: 123,
      b: 123,
      c: [11, 22, 33],
      d: 12
    })
  })

  it('should serialize and deserialize math schemas', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const MixComponent = engine.defineComponent('1222', {
      v3: Schemas.Vector3,
      q: Schemas.Quaternion,
      c3: Schemas.Color3,
      c4: Schemas.Color4
    })

    const originalValue = MixComponent.create(entity, {
      c3: { r: 0.1, g: 0.2, b: 0.3 },
      c4: { r: 0.4, g: 0.5, b: 0.6, a: 0.7 },
      q: { x: 0.8, y: 0.9, z: 1.0, w: 1.1 },
      v3: { x: 1.2, y: 1.3, z: 1.4 }
    })

    const buf = new ReadWriteByteBuffer()
    MixComponent.schema.serialize(MixComponent.get(entity), buf)
    const value = MixComponent.schema.deserialize(buf)

    expect(value).toBeDeepCloseTo(originalValue)
  })

  it('should serialize Entities', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const entityCopied = engine.addEntity()
    const someEntity = engine.addEntity()

    const EntityComponent = engine.defineComponent('998', {
      value: Schemas.Entity
    })
    const myEntity = EntityComponent.create(entity, { value: someEntity })
    expect(myEntity.value).toBe(someEntity)

    const buffer = new ReadWriteByteBuffer()
    EntityComponent.schema.serialize(EntityComponent.get(entity), buffer)
    const copiedEntity = EntityComponent.create(entityCopied)
    expect(copiedEntity.value).toBe(engine.RootEntity)
    const updatedEntity = EntityComponent.schema.deserialize(buffer)
    expect(updatedEntity!.value).toBe(someEntity)
  })

  it('should fail with wrong enums', () => {
    expect(() => {
      enum BadEnum {
        Red = '2',
        Green = '0x33',
        Pink = '0x1f290323'
      }

      Schemas.EnumNumber<BadEnum>(BadEnum, BadEnum.Red)
    }).toThrowError()

    expect(() => {
      enum BadEnum {
        Red = 2,
        Green = 0x33,
        Pink = 0x1f290323
      }

      Schemas.EnumString<BadEnum>(BadEnum, BadEnum.Red)
    }).toThrowError()

    expect(() => {
      enum BadEnum {
        Red = 2,
        Green = 0x33,
        Pink = 0x1f290323,
        StringColor = 'someColorString'
      }

      Schemas.EnumNumber<BadEnum>(BadEnum, BadEnum.Red)
    }).toThrowError()

    expect(() => {
      enum BadEnum {
        Red = 2,
        Green = 0x33,
        Pink = 0xff290323 // is out of range
      }

      Schemas.EnumNumber<BadEnum>(BadEnum, BadEnum.Red)
    }).toThrowError()

    expect(() => {
      enum BadEnum {
        Red = '2',
        Green = '0x33',
        Pink = '0x1f290323',
        NumberColor = 435
      }

      Schemas.EnumString<BadEnum>(BadEnum, BadEnum.Red)
    }).toThrowError()

    expect(() => {
      enum RightEnum {
        Red = '2',
        Green = '0x33',
        Pink = '0x1f290323'
      }

      Schemas.EnumString<RightEnum>(RightEnum, RightEnum.Red)
    }).not.toThrowError()

    expect(() => {
      enum RightEnum {
        Red = 2,
        Green = 0x33,
        Pink = 0x1f290323
      }

      Schemas.EnumNumber<RightEnum>(RightEnum, RightEnum.Red)
    }).not.toThrowError()
  })
})
describe('test json-schema function', () => {
  it('should get the same schema with json', () => {
    enum StringEnum {
      FIRST = 'first_item',
      SECOND = 'second_item',
      THIRD = '3rd'
    }
    enum IntEnum {
      FIRST = 1,
      SECOND = 2,
      THIRD = 3
    }

    const engine = Engine()
    const mapWithAllPrimitives = {
      someBoolean: Schemas.Boolean,
      someString: Schemas.String,
      someFloat: Schemas.Float,
      someDouble: Schemas.Double,
      someByte: Schemas.Byte,
      someShort: Schemas.Short,
      someInt: Schemas.Int,
      someInt64: Schemas.Int64,
      someNumber: Schemas.Number,
      someVector3: Schemas.Vector3,
      someQuaternion: Schemas.Quaternion,
      someColor3: Schemas.Color3,
      someColor4: Schemas.Color4,
      someEntity: Schemas.Entity,
      someIntEnum: Schemas.EnumNumber(IntEnum, IntEnum.THIRD),
      someIntEnum2: Schemas.EnumNumber(IntEnum, IntEnum.SECOND),
      someStringEnum: Schemas.EnumString(StringEnum, StringEnum.FIRST),
      someStringEnum2: Schemas.EnumString(StringEnum, StringEnum.THIRD),
      optionalValue: Schemas.Optional(Schemas.String)
    }

    const comp = engine.defineComponent('test', {
      arrayOf: Schemas.Array(Schemas.Map(mapWithAllPrimitives)),
      mapOf: Schemas.Map(mapWithAllPrimitives),
      oneOf: Schemas.OneOf(mapWithAllPrimitives)
    })

    const jsonSchemaComponent = JSON.parse(JSON.stringify(comp.schema.jsonSchema))
    const schemaFromJson = jsonSchemaToSchema(jsonSchemaComponent)
    const clonedComp = engine.defineComponentFromSchema('test-cloned', schemaFromJson)

    expect(comp.schema.create()).toStrictEqual(clonedComp.schema.create())
  })

  it('should fail with unknown schema description', () => {
    expect(() => {
      jsonSchemaToSchema({
        type: 'super-strange-description' as any,
        serializationType: 'sarasa' as any
      })
    }).toThrowError()
  })

  it('should mutate each value', () => {
    const MySchemaDefinition = {
      someImportantEntity: Schemas.Entity,
      manyEntities: Schemas.Array(Schemas.Entity),
      valueWithoutChanges: Schemas.Int,
      manyPairOfEntities: Schemas.Array(Schemas.Array(Schemas.Entity)),
      nestedMap: Schemas.Map({
        someImportantEntity: Schemas.Entity,
        manyEntities: Schemas.Array(Schemas.Entity),
        valueWithoutChanges: Schemas.Int,
        manyPairOfEntities: Schemas.Array(Schemas.Array(Schemas.Entity))
      }),
      oneOrTheOther: Schemas.OneOf({ someEntity: Schemas.Entity, someBool: Schemas.Boolean }),
      oneOrTheOtherMap: Schemas.OneOf({
        first: Schemas.Map({ anEntity: Schemas.Entity }),
        second: Schemas.Map({ aNumber: Schemas.Number })
      }),
      oneOrOtherArray: Schemas.Array(Schemas.OneOf({ someEntity: Schemas.Entity, someBool: Schemas.Boolean })),
      oneOrTheOtherWithoutChanges: Schemas.OneOf({ someEntity: Schemas.Entity, someBool: Schemas.Boolean }),
      nestedOneOrTheOtherWithoutChanges: Schemas.OneOf({
        first: Schemas.Map({ anEntity: Schemas.Entity }),
        second: Schemas.Map({ aNumber: Schemas.Number })
      }),
      arrayOfOneOrTheOtherWithoutChanges: Schemas.Array(
        Schemas.OneOf({ someEntity: Schemas.Entity, someBool: Schemas.Boolean })
      )
    }

    const MySchema = Schemas.Map(MySchemaDefinition)

    const someValue = MySchema.create()

    someValue.someImportantEntity = 1 as Entity
    someValue.manyEntities = [2, 3, 4] as Entity[]
    someValue.manyPairOfEntities = [
      [5, 6, 7, 8],
      [9, 10, 11, 12]
    ] as Entity[][]
    someValue.valueWithoutChanges = 13

    someValue.nestedMap.someImportantEntity = 14 as Entity
    someValue.nestedMap.manyEntities = [15, 16, 17] as Entity[]
    someValue.nestedMap.manyPairOfEntities = [
      [18, 19, 20, 21],
      [22, 23, 24, 25]
    ] as Entity[][]
    someValue.nestedMap.valueWithoutChanges = 26
    someValue.oneOrTheOther = { $case: 'someEntity', value: 27 as Entity }
    someValue.oneOrTheOtherMap = { $case: 'first', value: { anEntity: 28 as Entity } }
    someValue.oneOrOtherArray = [{ $case: 'someEntity', value: 29 as Entity }]

    mutateValues(MySchema.jsonSchema, someValue, (currentValue, valueType) => {
      if (valueType.serializationType === 'entity') {
        return { changed: true, value: (currentValue as number) + 1000 }
      }
      return { changed: false }
    })

    expect(someValue).toStrictEqual({
      someImportantEntity: 1001 as Entity,
      manyEntities: [1002, 1003, 1004] as Entity[],
      manyPairOfEntities: [
        [1005, 1006, 1007, 1008],
        [1009, 1010, 1011, 1012]
      ] as Entity[][],
      valueWithoutChanges: 13,
      nestedMap: {
        someImportantEntity: 1014 as Entity,
        manyEntities: [1015, 1016, 1017] as Entity[],
        manyPairOfEntities: [
          [1018, 1019, 1020, 1021],
          [1022, 1023, 1024, 1025]
        ] as Entity[][],
        valueWithoutChanges: 26
      },
      oneOrTheOther: 1027 as Entity,
      oneOrTheOtherMap: { first: { anEntity: 1028 as Entity } },
      oneOrOtherArray: [1029],
      oneOrTheOtherWithoutChanges: {},
      nestedOneOrTheOtherWithoutChanges: {},
      arrayOfOneOrTheOtherWithoutChanges: []
    })
  })
})
