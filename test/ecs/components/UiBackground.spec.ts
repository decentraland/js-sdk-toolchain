import {
  Engine,
  components,
  BackgroundTextureMode,
  TextureWrapMode,
  TextureFilterMode
} from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated UiBackground ProtoBuf', () => {
  it('should serialize/deserialize UiBackground', () => {
    const newEngine = Engine()
    const UiBackground = components.UiBackground(newEngine)

    testComponentSerialization(UiBackground, {
      color: { r: 0, g: 0, b: 0, a: 0 },
      textureMode: BackgroundTextureMode.CENTER,
      texture: {
        tex: {
          $case: 'texture',
          texture: {
            src: 'some-src',
            wrapMode: TextureWrapMode.TWM_CLAMP,
            filterMode: TextureFilterMode.TFM_BILINEAR
          }
        }
      },
      textureSlices: {
        top: 1 / 3,
        left: 1 / 3,
        right: 1 / 3,
        bottom: 1 / 3
      },
      uvs: []
    })

    testComponentSerialization(UiBackground, {
      color: { r: 0, g: 0, b: 1, a: 0 },
      textureMode: BackgroundTextureMode.CENTER,
      uvs: [],
      texture: undefined,
      textureSlices: undefined
    })
  })
})
