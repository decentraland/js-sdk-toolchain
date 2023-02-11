import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated UiText ProtoBuf', () => {
  it('should serialize/deserialize UiText', () => {
    const newEngine = Engine()
    const UiText = components.UiText(newEngine)

    testComponentSerialization(UiText, {
      value: 'casla-boedo',
      color: { r: 0, g: 0, b: 0, a: 0 },
      font: undefined,
      fontSize: undefined,
      textAlign: undefined
    })

    testComponentSerialization(UiText, {
      value: 'casla',
      color: { r: 0, g: 0, b: 1, a: 0 },
      font: undefined,
      fontSize: undefined,
      textAlign: undefined
    })
  })
})
