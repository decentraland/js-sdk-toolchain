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
            filterMode: TextureFilterMode.TFM_BILINEAR,
            offset: undefined,
            tiling: undefined
          }
        }
      },
      textureSlices: {
        top: 2,
        left: 2,
        right: 2,
        bottom: 2
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
