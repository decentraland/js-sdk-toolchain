import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated VisibilityComponent ProtoBuf', () => {
  it('should serialize/deserialize VisibilityComponent', () => {
    const newEngine = Engine()
    const { VisibilityComponent } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _shape = VisibilityComponent.create(entity)

    VisibilityComponent.create(entityB)
    const buffer = VisibilityComponent.toBinary(entity)
    VisibilityComponent.updateFromBinary(entityB, buffer)

    expect(_shape).toBeDeepCloseTo({
      ...VisibilityComponent.getMutable(entityB)
    })
  })
})
