import { Engine, components, TextureWrapMode, PBSkybox } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated Skybox ProtoBuf', () => {
  it('should serialize/deserialize Skybox with reflectionMap and skyboxTexture', () => {
    const newEngine = Engine()
    const Skybox = components.Skybox(newEngine)

    testComponentSerialization<PBSkybox>(Skybox, {
      reflectionMap: {
        tex: {
          $case: 'texture',
          texture: {
            src: 'images/env.png',
            wrapMode: undefined,
            filterMode: undefined,
            offset: undefined,
            tiling: undefined
          }
        }
      },
      skyboxTexture: {
        tex: {
          $case: 'texture',
          texture: {
            src: 'images/env.png',
            wrapMode: TextureWrapMode.TWM_REPEAT,
            filterMode: undefined,
            offset: undefined,
            tiling: undefined
          }
        }
      }
    })
  })

  it('should serialize/deserialize Skybox with only skyboxTexture', () => {
    const newEngine = Engine()
    const Skybox = components.Skybox(newEngine)

    testComponentSerialization<PBSkybox>(Skybox, {
      reflectionMap: undefined,
      skyboxTexture: {
        tex: {
          $case: 'texture',
          texture: {
            src: 'images/env.png',
            wrapMode: TextureWrapMode.TWM_REPEAT,
            filterMode: undefined,
            offset: undefined,
            tiling: undefined
          }
        }
      }
    })
  })

  it('should serialize/deserialize Skybox with both fields undefined', () => {
    const newEngine = Engine()
    const Skybox = components.Skybox(newEngine)

    testComponentSerialization<PBSkybox>(Skybox, {
      reflectionMap: undefined,
      skyboxTexture: undefined
    })
  })
})
