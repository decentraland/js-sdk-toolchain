import { Engine, components, TextAlignMode, Font } from '../../../packages/@dcl/ecs/src'
import { Color4 } from '../../../packages/@dcl/sdk/math'

describe('UiDropdown component', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const UiDropdown = components.UiDropdown(newEngine)
    const entity = newEngine.addEntity()

    UiDropdown.create(entity, {
      acceptEmpty: false,
      selectedIndex: 0,
      options: ['1', '2'],
      disabled: false,
      color: Color4.Red(),
      textAlign: TextAlignMode.TAM_BOTTOM_CENTER,
      font: Font.F_SANS_SERIF,
      fontSize: 14
    })

    const buffer = UiDropdown.toBinary(entity)
    UiDropdown.upsertFromBinary(entity, buffer)
    const entityB = newEngine.addEntity()
    expect(UiDropdown.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...UiDropdown.get(entity)
    })
  })
})
