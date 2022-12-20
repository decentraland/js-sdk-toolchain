import { Engine, components } from '../../../packages/@dcl/ecs/src'

describe('UiInputResult component', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const UiInputResult = components.UiInputResult(newEngine)
    const entity = newEngine.addEntity()

    UiInputResult.create(entity, {
      value: 'Boedo its carnaval'
    })

    const buffer = UiInputResult.toBinary(entity)
    UiInputResult.upsertFromBinary(entity, buffer)
    const entityB = newEngine.addEntity()
    expect(UiInputResult.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...UiInputResult.get(entity)
    })
  })
})
