import { Engine, components, InputAction } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated UiInputBinding ProtoBuf', () => {
  it('should serialize/deserialize UiInputBinding', () => {
    const newEngine = Engine()
    const UiInputBinding = components.UiInputBinding(newEngine)

    testComponentSerialization(UiInputBinding, {
      actions: [InputAction.IA_JUMP]
    })

    testComponentSerialization(UiInputBinding, {
      actions: [InputAction.IA_PRIMARY, InputAction.IA_SECONDARY, InputAction.IA_ACTION_3]
    })

    testComponentSerialization(UiInputBinding, {
      actions: []
    })
  })
})
