import { Engine, components, InputAction } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated TouchScreenControls ProtoBuf', () => {
  it('should serialize/deserialize TouchScreenControls', () => {
    const newEngine = Engine()
    const TouchScreenControls = components.TouchScreenControls(newEngine)

    testComponentSerialization(TouchScreenControls, {
      touchInputs: [
        { inputAction: InputAction.IA_SECONDARY, hide: true, icon: undefined },
        { inputAction: InputAction.IA_JUMP, hide: false, icon: 'custom-jump' }
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
