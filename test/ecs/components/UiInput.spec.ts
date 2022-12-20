import {
  Engine,
  components,
  TextAlignMode,
  Font
} from '../../../packages/@dcl/ecs/src'
import { Color4 } from '../../../packages/@dcl/sdk/math'

describe('UiInput component', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const UiInput = components.UiInput(newEngine)
    const entity = newEngine.addEntity()

    UiInput.create(entity, {
      placeholder: 'Boedo its carnaval',
      disabled: false,
      color: Color4.Red(),
      placeholderColor: Color4.Blue(),
      textAlign: TextAlignMode.TAM_BOTTOM_CENTER,
      font: Font.F_SANS_SERIF,
      fontSize: 14
    })

    const buffer = UiInput.toBinary(entity)
    UiInput.upsertFromBinary(entity, buffer)
    const entityB = newEngine.addEntity()
    expect(UiInput.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...UiInput.get(entity)
    })
  })
})
