import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated TouchscreenInputControls ProtoBuf', () => {
  it('should serialize/deserialize TouchscreenInputControls', () => {
    const newEngine = Engine()
    const TouchscreenInputControls = components.TouchscreenInputControls(newEngine)

    testComponentSerialization(TouchscreenInputControls, {
      hideJoystick: true,
      hideGamepad: true
    })

    testComponentSerialization(TouchscreenInputControls, {
      hideJoystick: false,
      hideGamepad: false
    })
  })
})
