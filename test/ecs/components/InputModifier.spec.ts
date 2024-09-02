import { components, Engine } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated InputModifier ProtoBuf', () => {
  it('should serialize/deserialize InputModifier', () => {
    const newEngine = Engine()
    const InputModifier = components.InputModifier(newEngine)

    testComponentSerialization(InputModifier, {
      mode: {
        $case: 'standard',
        standard: {
          disableAll: true,
          disableWalk: true,
          disableJog: true,
          disableRun: true,
          disableJump: true,
          disableEmote: true
        }
      }
    })
  })
})