import { Engine, components } from '../../../packages/@dcl/ecs/src'

describe('Generated UiText ProtoBuf', () => {
  it('should serialize/deserialize UiText', () => {
    const newEngine = Engine()
    const UiText = components.UiText(newEngine)
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _uiText = UiText.create(entity, {
      value: 'casla-boedo',
      color: { r: 0, g: 0, b: 0, a: 0 }
    })

    UiText.create(entityB, {
      value: 'casla',
      color: { r: 0, g: 0, b: 1, a: 0 }
    })
    const buffer = UiText.toBinary(entity)
    UiText.upsertFromBinary(entityB, buffer)

    expect(_uiText).toEqual({
      value: 'casla-boedo',
      color: { r: 0, g: 0, b: 0, a: 0 }
    })
    expect(_uiText).not.toEqual(UiText.create(newEngine.addEntity()))
  })
})
