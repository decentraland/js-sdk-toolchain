import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('UiInputResult component', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const UiInputResult = components.UiInputResult(newEngine)

    testComponentSerialization(UiInputResult, {
      value: 'Boedo its carnaval',
      isSubmit: false
    })
  })
})
