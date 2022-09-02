import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated UiText ProtoBuf', () => {
  it('should serialize/deserialize UiText', () => {
    const newEngine = Engine()
    const { UiText } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _uiText = UiText.create(entity, {
      text: 'not-casla',
      textColor: { r: 0, g: 0, b: 0 }
    })

    UiText.create(entityB, {
      text: 'not-casla',
      textColor: { r: 0, g: 0, b: 1 }
    })
    const buffer = UiText.toBinary(entity)
    UiText.updateFromBinary(entityB, buffer)

    expect(_uiText).toBeDeepCloseTo({ ...UiText.getMutable(entityB) } as any)

    expect(UiText.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...UiText.getMutable(entity)
    } as any)
  })
})
