import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'

describe('when an optional value is falsy but present', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer()
  })

  it('should round-trip false', () => {
    const schema = Schemas.Optional(Schemas.Boolean)
    schema.serialize(false, buffer)

    expect(schema.deserialize(buffer)).toBe(false)
  })

  it('should round-trip zero', () => {
    const schema = Schemas.Optional(Schemas.Int)
    schema.serialize(0, buffer)

    expect(schema.deserialize(buffer)).toBe(0)
  })

  it('should round-trip an empty string', () => {
    const schema = Schemas.Optional(Schemas.String)
    schema.serialize('', buffer)

    expect(schema.deserialize(buffer)).toBe('')
  })
})

describe('when an optional value is absent', () => {
  let schema: ReturnType<typeof Schemas.Optional<boolean>>
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    schema = Schemas.Optional(Schemas.Boolean)
    buffer = new ReadWriteByteBuffer()
  })

  it('should round-trip undefined', () => {
    schema.serialize(undefined, buffer)

    expect(schema.deserialize(buffer)).toBeUndefined()
  })

  it('should be what create returns', () => {
    expect(schema.create()).toBeUndefined()
  })
})

describe('when a component carries an optional flag set to false', () => {
  let engine: ReturnType<typeof Engine>
  let component: ReturnType<typeof engine.defineComponent>
  let entity: ReturnType<typeof engine.addEntity>

  beforeEach(async () => {
    engine = Engine()
    component = engine.defineComponent('test::optional', { flag: Schemas.Optional(Schemas.Boolean) })
    entity = engine.addEntity()
    component.create(entity, { flag: true })
    await engine.update(1)

    component.getMutable(entity).flag = false
    await engine.update(1)
  })

  it('should keep it false rather than dropping it', () => {
    const buffer = new ReadWriteByteBuffer()
    component.schema.serialize(component.get(entity), buffer)

    expect(component.schema.deserialize(buffer)).toEqual({ flag: false })
  })
})
