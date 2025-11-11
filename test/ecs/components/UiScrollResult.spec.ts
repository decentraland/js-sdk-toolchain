import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated UiScrollResult ProtoBuf', () => {
  it('should serialize/deserialize UiScrollResult', () => {
    const newEngine = Engine()
    const UiScrollResult = components.UiScrollResult(newEngine)

    testComponentSerialization(UiScrollResult, {
      value: { x: 0, y: 2 }
    })

    testComponentSerialization(UiScrollResult, {
      value: undefined
    })
  })
})
