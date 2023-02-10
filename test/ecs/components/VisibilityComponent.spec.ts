import { Engine, components } from '../../../packages/@dcl/ecs/src'

describe('Generated VisibilityComponent ProtoBuf', () => {
  it('should serialize/deserialize VisibilityComponent', () => {
    const newEngine = Engine()
    const VisibilityComponent = components.VisibilityComponent(newEngine)
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _shape = VisibilityComponent.create(entity)

    VisibilityComponent.create(entityB)
    const buffer = VisibilityComponent.toBinary(entity)
    VisibilityComponent.upsertFromBinary(entityB, buffer)

    expect(_shape).toBeDeepCloseTo({
      ...VisibilityComponent.getMutable(entityB)
    })
  })
})
