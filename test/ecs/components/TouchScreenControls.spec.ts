import { Engine, components, InputAction } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated TouchScreenControls ProtoBuf', () => {
  it('should serialize/deserialize TouchScreenControls', () => {
    const newEngine = Engine()
    const TouchScreenControls = components.TouchScreenControls(newEngine)

    testComponentSerialization(TouchScreenControls, {
      touchInputs: [
        { inputAction: InputAction.IA_SECONDARY, hide: true, icon: undefined },
        {
          inputAction: InputAction.IA_JUMP,
          hide: false,
          icon: {
            tex: {
              $case: 'texture',
              texture: {
                src: 'custom-jump',
                wrapMode: undefined,
                filterMode: undefined,
                offset: undefined,
                tiling: undefined
              }
            }
          }
        }
      ],
      mainAction: InputAction.IA_PRIMARY,
      hideJoystick: true,
      hideCrosshair: true
    })

    testComponentSerialization(TouchScreenControls, {
      touchInputs: [],
      mainAction: undefined,
      hideJoystick: false,
      hideCrosshair: false
    })
  })
})
