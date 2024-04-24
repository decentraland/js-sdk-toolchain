import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated RealmInfo ProtoBuf', () => {
  it('should serialize/deserialize move RealmInfo', () => {
    const newEngine = Engine()
    const RealmInfo = components.RealmInfo(newEngine)

    testComponentSerialization(RealmInfo, {
      baseUrl: 'boedo://casla',
      commsAdapter: 'boedo-casla',
      networkId: 1,
      realmName: 'boedo',
      room: 'casla',
      isPreview: false
    })

    testComponentSerialization(RealmInfo, {
      baseUrl: 'boedo://casla',
      commsAdapter: 'boedo-casla',
      networkId: 1,
      realmName: 'boedo',
      room: 'casla',
      isPreview: false
    })
  })
})
