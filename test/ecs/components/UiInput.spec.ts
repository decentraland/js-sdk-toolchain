import { Engine, components, TextAlignMode, Font } from '../../../packages/@dcl/ecs/src'
import { Color4 } from '../../../packages/@dcl/sdk/math'
import { testComponentSerialization } from './assertion'

describe('UiInput component', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const UiInput = components.UiInput(newEngine)

    testComponentSerialization(UiInput, {
      placeholder: 'Boedo its carnaval',
      value: 'text-value',
      disabled: false,
      color: Color4.Red(),
      placeholderColor: Color4.Blue(),
      textAlign: TextAlignMode.TAM_BOTTOM_CENTER,
      font: Font.F_SANS_SERIF,
      fontSize: 14
    })
  })
})
