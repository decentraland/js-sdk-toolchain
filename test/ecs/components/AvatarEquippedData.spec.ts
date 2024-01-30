import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated AvatarEquippedData ProtoBuf', () => {
  it('should serialize/deserialize AvatarEquippedData', () => {
    const newEngine = Engine()
    const AvatarEquippedData = components.AvatarEquippedData(newEngine)

    testComponentSerialization(AvatarEquippedData, {
      wearableUrns: ['boedo', 'casla'],
      emoteUrns: ['wave', 'ortigoaz']
    })
  })
})
