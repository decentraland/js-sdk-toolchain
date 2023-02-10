import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('UiDropdownResult component', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const UiDropdownResult = components.UiDropdownResult(newEngine)

    testComponentSerialization(UiDropdownResult, {
      value: 1
    })
  })
})
