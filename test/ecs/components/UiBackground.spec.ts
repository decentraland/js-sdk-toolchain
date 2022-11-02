import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('Generated UiBackground ProtoBuf', () => {
  it('should serialize/deserialize UiBackground', () => {
    const newEngine = Engine()
    const { UiBackground } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _uiBackground = UiBackground.create(entity, {
      backgroundColor: { r: 0, g: 0, b: 0, a: 0 }
    })

    UiBackground.create(entityB, {
      backgroundColor: { r: 0, g: 0, b: 1, a: 0 }
    })
    const buffer = UiBackground.toBinary(entity)
    UiBackground.updateFromBinary(entityB, buffer)

    expect(_uiBackground).toEqual({
      backgroundColor: { r: 0, g: 0, b: 0, a: 0 }
    })
  })
})
