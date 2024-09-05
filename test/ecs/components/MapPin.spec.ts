import { Engine } from '../../../packages/@dcl/ecs/src'
import { MapPinSchema } from '../../../packages/@dcl/ecs/src/components/generated/MapPin.gen'
import { testComponentSerialization } from './assertion'

describe('Generated Billboard ProtoBuf', () => {
  it('should serialize/deserialize Billboard', () => {
    const newEngine = Engine()
    const MapPin = newEngine.defineComponentFromSchema('core::MapPin', MapPinSchema)

    testComponentSerialization(MapPin, {
      description: 'casla',
      iconSize: 8,
      position: { x: 8, y: 8 },
      title: 'boedo',
      texture: undefined
    })
  })
})
