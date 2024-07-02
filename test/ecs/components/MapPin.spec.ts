import { Engine, TextureFilterMode, TextureWrapMode, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated Map Pin ProtoBuf', () => {
  it('should serialize/deserialize move Tween', () => {
    const newEngine = Engine()
    const MapPin = components.MapPin(newEngine)

    testComponentSerialization(MapPin, {
      title: 'Title',
      description: 'Description',
      iconSize: 0.5,
      position: { x: 1, y: 2 },
      texture: {
        tex: {
          $case: 'texture',
          texture: {
            src: 'models/boedo.glb',
            filterMode: TextureFilterMode.TFM_POINT,
            wrapMode: TextureWrapMode.TWM_CLAMP
          }
        }
      }
    })
  })
})
