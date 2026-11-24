import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { testComponentSerialization } from './assertion'

describe('Generated AvatarEquippedData ProtoBuf', () => {
  it('should serialize/deserialize AvatarEquippedData', () => {
    const newEngine = Engine()
    const AvatarEquippedData = components.AvatarEquippedData(newEngine)

    testComponentSerialization(AvatarEquippedData, {
      wearableUrns: ['boedo', 'casla'],
      emoteUrns: ['wave', 'ortigoaz'],
      wearables: [],
      forceRender: []
    })

    testComponentSerialization(AvatarEquippedData, {
      wearableUrns: ['boedo', 'casla'],
      emoteUrns: ['wave', 'ortigoaz'],
      wearables: [],
      forceRender: ['hands_wear']
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
      ],
      forceRender: ['hands_wear']
    })
  })

  it('serializes an omitted forceRender as an empty list', () => {
    const newEngine = Engine()
    const AvatarEquippedData = components.AvatarEquippedData(newEngine)
    const entity = newEngine.addEntity()

    AvatarEquippedData.create(entity, { wearableUrns: [], emoteUrns: [], wearables: [] })
    expect(AvatarEquippedData.get(entity).forceRender).toBeUndefined()

    const buffer = new ReadWriteByteBuffer()
    AvatarEquippedData.schema.serialize(AvatarEquippedData.get(entity), buffer)
    expect(AvatarEquippedData.schema.deserialize(buffer).forceRender).toStrictEqual([])
  })
})
