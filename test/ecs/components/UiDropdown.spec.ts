import { Engine, components, TextAlignMode, Font } from '../../../packages/@dcl/ecs/src'
import { Color4 } from '../../../packages/@dcl/sdk/math'
import { testComponentSerialization } from './assertion'

describe('UiDropdown component', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const UiDropdown = components.UiDropdown(newEngine)

    testComponentSerialization(UiDropdown, {
      acceptEmpty: false,
      emptyLabel: undefined,
      selectedIndex: 0,
      options: ['1', '2'],
      disabled: false,
      color: Color4.Red(),
      textAlign: TextAlignMode.TAM_BOTTOM_CENTER,
      font: Font.F_SANS_SERIF,
      fontSize: 14
    })
  })
})
