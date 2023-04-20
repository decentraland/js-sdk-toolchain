import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated UiCanvasInformation ProtoBuf', () => {
  it('should serialize/deserialize UiCanvasInformation', () => {
    const newEngine = Engine()
    const UiCanvasInformation = components.UiCanvasInformation(newEngine)

    testComponentSerialization(UiCanvasInformation, {
      devicePixelRatio: 1,
      height: 1,
      width: 1,
      interactableArea: {
        bottom: 0,
        left: 0,
        right: 0,
        top: 0
      }
    })
  })
})
