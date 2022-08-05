import {
  ArrayType,
  ComponentSchema,
  Float32,
  Float64,
  Int16,
  Int32,
  Int64,
  Int8,
  MapType,
  EcsString,
  Optional,
  EcsBoolean,
  Enum
} from '../src/built-in-types'
import { Engine } from '../src/engine'

const Vector3 = MapType({ x: Float32, y: Float32, z: Float32 })

describe('Serialization Types', () => {
  it('should serialize Ints', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const entityCopied = engine.addEntity()
    const toTest = [Int16, Int32, Int8]
    let COMPONENT_ID = 888

    for (const t of toTest) {
      const IntegerComponent = engine.defineComponent(
        COMPONENT_ID++,
        MapType({ value: t })
      )
      const myInteger = IntegerComponent.create(entity, { value: 33 })
      expect(myInteger.value).toBe(33)

      const buffer = IntegerComponent.toBinary(entity)
      const copiedInteger = IntegerComponent.create(entityCopied, { value: 21 })
      expect(copiedInteger.value).toBe(21)
      const updatedInteger = IntegerComponent.updateFromBinary(
        entityCopied,
        buffer
      )
      expect(updatedInteger!.value).toBe(33)

      expect(t.create()).toEqual(0)
    }
  })

  it('should serialize Floats', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const entityCopied = engine.addEntity()
    const toTest = [Float32, Float64]
    let COMPONENT_ID = 888
    const testValue = 2.0

    for (const t of toTest) {
      const FloatComponent = engine.defineComponent(
        COMPONENT_ID++,
        MapType({ value: t })
      )
      const myFloat = FloatComponent.create(entity, { value: testValue })
      expect(myFloat.value).toBe(testValue)

      const buffer = FloatComponent.toBinary(entity)
      const copiedFloat = FloatComponent.create(entityCopied, { value: 21.22 })
      expect(copiedFloat.value).toBe(21.22)
      const updatedFloat = FloatComponent.updateFromBinary(entityCopied, buffer)
      expect(updatedFloat!.value).toBe(testValue)
    }

    expect(Vector3.create()).toEqual({ x: 0, y: 0, z: 0 })
    expect(Float64.create()).toEqual(0.0)
  })

  it('should serialize Strings', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const entityCopied = engine.addEntity()

    let COMPONENT_ID = 888
    const testValue = 'testing an string'

    const FloatComponent = engine.defineComponent(
      COMPONENT_ID++,
      MapType({ value: EcsString })
    )
    const myFloat = FloatComponent.create(entity, { value: testValue })
    expect(myFloat.value).toBe(testValue)

    const buffer = FloatComponent.toBinary(entity)
    const copiedFloat = FloatComponent.create(entityCopied, { value: 'n' })
    expect(copiedFloat.value).toBe('n')
    const updatedFloat = FloatComponent.updateFromBinary(entityCopied, buffer)
    expect(updatedFloat!.value).toBe(testValue)
  })

  it('should serialize MapTypes', () => {
    const engine = Engine()
    const myEntity = engine.addEntity()
    const COMPONENT_ID = 888

    const ItemType = MapType({
      itemId: Int32,
      name: EcsString,
      enchantingIds: ArrayType(
        MapType({
          itemId: Int32,
          itemAmount: Int32,
          description: EcsString
        })
      )
    })

    const defaultValue = ItemType.create()

    expect(defaultValue).toEqual({ itemId: 0, name: '', enchantingIds: [] })

    const PlayerComponent = engine.defineComponent(
      COMPONENT_ID,
      MapType({
        name: EcsString,
        description: EcsString,
        level: Int32,
        hp: Float32,
        position: Vector3,
        targets: ArrayType(Vector3),
        items: ArrayType(ItemType)
      })
    )

    const defaultPlayer = {
      name: '',
      description: '',
      level: 1,
      hp: 0.0,
      position: { x: 1.0, y: 50.0, z: 50.0 },
      targets: [],
      items: []
    }

    const myPlayer = PlayerComponent.create(myEntity, defaultPlayer)

    expect(PlayerComponent.getFrom(myEntity)).toStrictEqual(defaultPlayer)

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

    const buffer = PlayerComponent.toBinary(myEntity)

    const otherEntity = engine.addEntity()

    PlayerComponent.create(otherEntity, defaultPlayer)
    PlayerComponent.updateFromBinary(otherEntity, buffer)

    const originalPlayer = PlayerComponent.getFrom(myEntity)
    const modifiedFromBinaryPlayer = PlayerComponent.getFrom(otherEntity)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(modifiedFromBinaryPlayer).toBeDeepCloseTo(originalPlayer)
  })

  it('should serialize Optional & Boolean without value (undefined)', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const COMPONENT_ID = 888

    const definition = MapType({
      optionalColor: Optional(
        MapType({
          r: Float32,
          g: Float32,
          b: Float32
        })
      ),
      hasAlpha: EcsBoolean
    })

    const TestComponent = engine.defineComponent(COMPONENT_ID, definition)

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

    const value2 = TestComponent.updateFromBinary(
      entity2,
      TestComponent.toBinary(entity)
    )!

    expect(value2.hasAlpha).toBe(true)
    expect(value2.optionalColor).toBeUndefined()
  })

  it('should serialize Optional & Boolean with value', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const COMPONENT_ID = 888

    const TestComponent = engine.defineComponent(
      COMPONENT_ID,
      MapType({
        optionalColor: Optional(EcsBoolean),
        visible: Optional(EcsBoolean),
        notVisible: EcsBoolean
      })
    )

    TestComponent.create(entity, { optionalColor: true, notVisible: false })

    expect(TestComponent.toBinary(entity).toBinary()).toStrictEqual(
      new Uint8Array([1, 1, 0, 0])
    )
    expect(TestComponent.getFrom(entity).optionalColor).toBe(true)

    // Deserialize and update new optional
    const newEntity = engine.addEntity()
    TestComponent.create(newEntity, {
      optionalColor: true,
      visible: true,
      notVisible: false
    })
    TestComponent.upsertFromBinary(entity, TestComponent.toBinary(newEntity))

    expect(TestComponent.toBinary(entity).toBinary()).toStrictEqual(
      new Uint8Array([1, 1, 1, 1, 0])
    )
  })

  it('should serialize Int Enums', () => {
    const engine = Engine()
    const entity = engine.addEntity()
    const COMPONENT_ID = 888

    enum ColorToNumber {
      Default = 0,
      Red = 2,
      Green = 0x33,
      Pink = 0xff290323
    }

    const TestComponent = engine.defineComponent(
      COMPONENT_ID,
      Enum<ColorToNumber>(Int64)
    )

    expect(TestComponent.create(entity)).toEqual(0)
    TestComponent.create(entity, ColorToNumber.Pink)

    const entity2 = engine.addEntity()
    const initialValue = TestComponent.create(entity2, ColorToNumber.Green)
    expect(initialValue).toBe(ColorToNumber.Green)

    const value2 = TestComponent.updateFromBinary(
      entity2,
      TestComponent.toBinary(entity)
    )!

    expect(value2).toBe(ColorToNumber.Pink)
  })

  it('should serialize String Enum', () => {
    const engine = Engine()
    const entity = engine.addEntity() // 0
    const COMPONENT_ID = 888

    enum ColorToString {
      Red = '2',
      Green = '0x33',
      Pink = '0xff290323'
    }

    const TestComponent = engine.defineComponent(
      COMPONENT_ID,
      Enum<ColorToString>(EcsString)
    )

    // const value1 = TestComponent.create(entity, {})
    expect(TestComponent.create(entity)).toEqual('')
    TestComponent.create(entity, ColorToString.Pink)

    const entity2 = engine.addEntity()
    const initialValue = TestComponent.create(entity2, ColorToString.Green)
    expect(initialValue).toBe(ColorToString.Green)

    const value2 = TestComponent.updateFromBinary(
      entity2,
      TestComponent.toBinary(entity)
    )!

    expect(value2).toBe(ColorToString.Pink)
  })

  it('should deserialize and serialize component from binary', () => {
    const engine = Engine()
    const entityFilled = engine.addEntity() // 0
    const entityEmpty = engine.addEntity() // 1
    const COMPONENT_ID = 888

    const TestComponentType = engine.defineComponent(
      COMPONENT_ID,
      MapType({
        a: Int32,
        b: Int32,
        c: ArrayType(Int32),
        d: Int64
      })
    )
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

    const buffer = TestComponentType.toBinary(entityFilled)
    TestComponentType.updateFromBinary(entityEmpty, buffer)

    const modifiedComponent = TestComponentType.getFrom(entityEmpty)
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
    const vectorType: Record<string, ComponentSchema<number>> = {}
    const objectValues: Record<string, number> = {}
    const zeroObjectValues: Record<string, number> = {}

    for (i = 0; i < A.length; i++) {
      const COMPONENT_ID = 888 + i + 1
      const key = A[i]
      vectorType[key] = Int32
      objectValues[key] = 50 + i
      zeroObjectValues[key] = 0
      const TestComponentType = engine.defineComponent(
        COMPONENT_ID,
        MapType(vectorType)
      )

      TestComponentType.create(entity, objectValues)
      TestComponentType.create(entityCopied, zeroObjectValues)
      const buffer = TestComponentType.toBinary(entity)
      TestComponentType.updateFromBinary(entityCopied, buffer)
      expect(TestComponentType.getFrom(entity)).toStrictEqual(
        TestComponentType.getFrom(entityCopied)
      )
    }
  })
})
