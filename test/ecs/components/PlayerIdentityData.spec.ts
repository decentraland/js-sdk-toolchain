import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated PlayerIdentityData ProtoBuf', () => {
  it('should serialize/deserialize PlayerIdentityData', () => {
    const newEngine = Engine()
    const PlayerIdentityData = components.PlayerIdentityData(newEngine)

    testComponentSerialization(PlayerIdentityData, {
      address: 'boedo.dcl.eth',
      isGuest: false
    })
  })
})
