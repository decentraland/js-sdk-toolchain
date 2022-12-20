import {
  Engine,
  components,
  BackgroundTextureMode
} from '../../../packages/@dcl/ecs/src'

describe('Generated UiBackground ProtoBuf', () => {
  it('should serialize/deserialize UiBackground', () => {
    const newEngine = Engine()
    const UiBackground = components.UiBackground(newEngine)
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _uiBackground = UiBackground.create(entity, {
      color: { r: 0, g: 0, b: 0, a: 0 },
      textureMode: BackgroundTextureMode.CENTER,
      uvs: []
    })

    UiBackground.create(entityB, {
      color: { r: 0, g: 0, b: 1, a: 0 },
      textureMode: BackgroundTextureMode.CENTER,
      uvs: []
    })
    const buffer = UiBackground.toBinary(entity)
    UiBackground.updateFromBinary(entityB, buffer)

    expect(_uiBackground).toEqual({
      color: { r: 0, g: 0, b: 0, a: 0 },
      uvs: [],
      textureMode: 1
    })
    expect(_uiBackground).not.toEqual(
      UiBackground.create(newEngine.addEntity())
    )
  })
})
