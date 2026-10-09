import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated VoiceChatModifierArea ProtoBuf', () => {
  it('should serialize/deserialize VoiceChatModifierArea with default values', () => {
    const newEngine = Engine()
    const VoiceChatModifierArea = components.VoiceChatModifierArea(newEngine)

    testComponentSerialization(VoiceChatModifierArea, {
      area: { x: 1, y: 2, z: 3 },
      excludeIds: [],
      volumeScale: undefined,
      maxDistance: undefined,
      mute: undefined,
      isolate: undefined
    })
  })

  it('should serialize/deserialize VoiceChatModifierArea with a full payload', () => {
    const newEngine = Engine()
    const VoiceChatModifierArea = components.VoiceChatModifierArea(newEngine)

    testComponentSerialization(VoiceChatModifierArea, {
      area: { x: 4, y: 3, z: 4 },
      excludeIds: ['0xperformer', 'testId'],
      volumeScale: 0.5,
      maxDistance: 3,
      mute: true,
      isolate: true
    })
  })
})
