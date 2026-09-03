import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'

const oneOfSpec = { velocity: Schemas.Int, label: Schemas.String }

describe('when a OneOf value has no case selected', () => {
  let schema: ReturnType<typeof Schemas.OneOf<typeof oneOfSpec>>
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    schema = Schemas.OneOf(oneOfSpec)
    buffer = new ReadWriteByteBuffer()
  })

  it('should be the value create returns', () => {
    expect(schema.create()).toEqual({})
  })

  it('should serialize without throwing', () => {
    expect(() => schema.serialize(schema.create(), buffer)).not.toThrow()
  })

  it('should come back with no case selected', () => {
    schema.serialize(schema.create(), buffer)

    expect(schema.deserialize(buffer)).toEqual({})
  })

  it('should leave the following value in the buffer readable', () => {
    schema.serialize(schema.create(), buffer)
    Schemas.Int.serialize(7, buffer)
    schema.deserialize(buffer)

    expect(Schemas.Int.deserialize(buffer)).toBe(7)
  })
})

describe('when a OneOf case is selected', () => {
  let schema: ReturnType<typeof Schemas.OneOf<typeof oneOfSpec>>
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    schema = Schemas.OneOf(oneOfSpec)
    buffer = new ReadWriteByteBuffer()
  })

  it('should round-trip the first case', () => {
    schema.serialize({ $case: 'velocity', value: 42 }, buffer)

    expect(schema.deserialize(buffer)).toEqual({ $case: 'velocity', value: 42 })
  })

  it('should round-trip a later case', () => {
    schema.serialize({ $case: 'label', value: 'boedo' }, buffer)

    expect(schema.deserialize(buffer)).toEqual({ $case: 'label', value: 'boedo' })
  })
})

describe('when a component with a OneOf field is created without a value', () => {
  let engine: ReturnType<typeof Engine>

  beforeEach(() => {
    engine = Engine()
    const component = engine.defineComponent('test::one-of', { choice: Schemas.OneOf(oneOfSpec) })
    component.create(engine.addEntity())
  })

  it('should let the engine finish the update that serializes it', async () => {
    await expect(engine.update(1)).resolves.toBeUndefined()
  })
})
