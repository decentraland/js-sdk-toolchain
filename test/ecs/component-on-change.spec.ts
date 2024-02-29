import { Transform as defineTransform } from '../../packages/@dcl/ecs/src/components'
import { Schemas, engine } from '../../packages/@dcl/ecs/src'

describe('onChange Component event', () => {
  engine.addTransport({
    send: async () => {},
    filter: () => true
  })
  const schema = Schemas.Map({
    timestamp: Schemas.Int,
    text: Schemas.String
  })

  const Transform = defineTransform(engine)
  const GrowOnlyComponent = engine.defineValueSetComponentFromSchema('test', schema, {
    timestampFunction: (value) => value.timestamp,
    maxElements: 10
  })
  const entity = engine.addEntity()
  const cb = jest.fn()
  afterEach(() => {
    jest.resetAllMocks()
    jest.restoreAllMocks()
  })

  it('should not called onChange on Transform if there is no change', async () => {
    Transform.onChange(entity, cb)
    await engine.update(1)
    expect(cb).toBeCalledTimes(0)
  })
  it('should call onChange cb if the transform is created', async () => {
    Transform.create(entity, { position: { x: 8, y: 8, z: 8 } })
    const transform = Transform.get(entity)
    await engine.update(1)
    expect(cb).toBeCalledWith(transform)
  })
  it('should call onChange cb if the transform is updated', async () => {
    Transform.getMutable(entity).position = { x: 88, y: 88, z: 88 }
    const transform = Transform.get(entity)
    await engine.update(1)
    expect(cb).toBeCalledWith(transform)
  })
  it('should return undefined if the component is deleted', async () => {
    Transform.deleteFrom(entity)
    await engine.update(1)
    expect(cb).toBeCalledWith(undefined)
  })

  it('should not called onChange on GrowOnlySet Cusdtom component if there is no change', async () => {
    GrowOnlyComponent.onChange(entity, cb)
    await engine.update(1)
    expect(cb).toBeCalledTimes(0)
  })
  it('should call onChange cb if the transform is created', async () => {
    GrowOnlyComponent.addValue(entity, { timestamp: 1, text: 'boedo' })
    const value = GrowOnlyComponent.get(entity)
    await engine.update(1)
    expect(cb).toBeCalledWith(value)
  })
  it('should return undefined if the component is deleted', async () => {
    console.log('-----------------------')
    engine.removeEntity(entity)
    await engine.update(1)
    expect(cb).toBeCalledWith(undefined)
  })
})
