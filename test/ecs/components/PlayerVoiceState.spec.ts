import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated PlayerVoiceState ProtoBuf', () => {
  it('should serialize/deserialize PlayerVoiceState', () => {
    const newEngine = Engine()
    const PlayerVoiceState = components.PlayerVoiceState(newEngine)

    testComponentSerialization(PlayerVoiceState, { isSpeaking: true })
    testComponentSerialization(PlayerVoiceState, { isSpeaking: false })
  })
})
