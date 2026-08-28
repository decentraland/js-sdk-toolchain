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
      forceRender: []
    })

    testComponentSerialization(AvatarEquippedData, {
      wearableUrns: ['boedo', 'casla'],
      emoteUrns: ['wave', 'ortigoaz'],
      forceRender: ['hands_wear']
    })
  })

  it('serializes an omitted forceRender as an empty list', () => {
    const newEngine = Engine()
    const AvatarEquippedData = components.AvatarEquippedData(newEngine)
    const entity = newEngine.addEntity()

    AvatarEquippedData.create(entity, { wearableUrns: [], emoteUrns: [] })
    expect(AvatarEquippedData.get(entity).forceRender).toBeUndefined()

    const buffer = new ReadWriteByteBuffer()
    AvatarEquippedData.schema.serialize(AvatarEquippedData.get(entity), buffer)
    expect(AvatarEquippedData.schema.deserialize(buffer).forceRender).toStrictEqual([])
  })
})
