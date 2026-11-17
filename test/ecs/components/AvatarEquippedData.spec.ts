import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated AvatarEquippedData ProtoBuf', () => {
  it('should serialize/deserialize AvatarEquippedData', () => {
    const newEngine = Engine()
    const AvatarEquippedData = components.AvatarEquippedData(newEngine)

    testComponentSerialization(AvatarEquippedData, {
      wearableUrns: ['boedo', 'casla'],
      emoteUrns: ['wave', 'ortigoaz'],
      wearables: []
    })
  })

  it('should serialize/deserialize AvatarEquippedData.wearables with visible set, unset and false', () => {
    const newEngine = Engine()
    const AvatarEquippedData = components.AvatarEquippedData(newEngine)

    testComponentSerialization(AvatarEquippedData, {
      wearableUrns: ['boedo', 'casla', 'huracan'],
      emoteUrns: ['wave'],
      wearables: [
        { urn: 'boedo', visible: true },
        { urn: 'casla', visible: undefined },
        { urn: 'huracan', visible: false }
      ]
    })
  })
})
