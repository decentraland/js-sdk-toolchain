import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated UiText ProtoBuf', () => {
  it('should serialize/deserialize UiText', () => {
    const newEngine = Engine()
    const { UiText } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _uiText = UiText.create(entity, {
      value: 'casla-boedo',
      color: { r: 0, g: 0, b: 0 }
    })

    UiText.create(entityB, {
      value: 'casla',
      color: { r: 0, g: 0, b: 1 }
    })
    const buffer = UiText.toBinary(entity)
    UiText.updateFromBinary(entityB, buffer)

    expect(_uiText).toEqual({
      value: 'casla-boedo',
      color: { r: 0, g: 0, b: 0 }
    })
  })
})
