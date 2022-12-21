import { Engine, components } from '../../../packages/@dcl/ecs/src'

describe('UiDropdownResult component', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const UiDropdownResult = components.UiDropdownResult(newEngine)
    const entity = newEngine.addEntity()

    UiDropdownResult.create(entity, {
      value: 1
    })

    const buffer = UiDropdownResult.toBinary(entity)
    UiDropdownResult.upsertFromBinary(entity, buffer)
    const entityB = newEngine.addEntity()
    expect(UiDropdownResult.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...UiDropdownResult.get(entity)
    })
  })
})
