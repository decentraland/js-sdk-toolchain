import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated AvatarLocomotionSettings ProtoBuf', () => {
  it('should serialize/deserialize AvatarLocomotionSettings', () => {
    const newEngine = Engine()
    const AvatarLocomotionSettings = components.AvatarLocomotionSettings(newEngine)

    testComponentSerialization(AvatarLocomotionSettings, {
      walkSpeed: 1,
      jogSpeed: 2,
      runSpeed: 3,
      jumpHeight: 4,
      runJumpHeight: 5,
      hardLandingCooldown: 6,
      doubleJumpHeight: 7,
      glidingSpeed: 8,
      glidingFallingSpeed: 9
    })
  })
})
