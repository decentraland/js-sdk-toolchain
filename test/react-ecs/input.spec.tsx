import {
  Engine,
  Entity,
  IEngine,
  createPointerEventSystem,
  createInputSystem,
  TextAlignMode,
  Font
} from '../../packages/@dcl/ecs'
import { components, IEngine as IIEngine } from '../../packages/@dcl/ecs/src'
import {
  createReactBasedUiSystem,
  ReactBasedUiSystem,
  ReactEcs,
  UiEntity
} from '../../packages/@dcl/react-ecs/src'
import { Color4 } from '../../packages/@dcl/sdk/math'

describe('Ui Listeners React Ecs', () => {
  let engine: IEngine
  let uiRenderer: ReactBasedUiSystem

  beforeEach(() => {
    engine = Engine()
    const Input = createInputSystem(engine)
    uiRenderer = createReactBasedUiSystem(
      engine,
      createPointerEventSystem(engine, Input)
    )
  })

  it('should run onClick if it was fake-clicked', async () => {
    const UiInputResult = components.UiInputResult(engine as IIEngine)
    const uiEntity = ((engine.addEntity() as number) + 1) as Entity
    const onChange: jest.Mock | undefined = jest.fn()
    const undefinedChange: jest.Mock | undefined = undefined
    let conditional = true
    const ui = () => (
      <UiEntity
        uiTransform={{
          width: 100
        }}
        uiInput={{
          placeholder: 'Boedo its carnaval',
          disabled: false,
          color: Color4.Red(),
          placeholderColor: Color4.Blue(),
          textAlign: TextAlignMode.TAM_BOTTOM_CENTER,
          font: Font.F_SANS_SERIF,
          fontSize: 14,
          onChange: conditional ? onChange : undefinedChange
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    expect(onChange).toBeCalledTimes(0)
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
    UiInputResult.create(uiEntity, { value: 'BOEDO' })
    await engine.update(1)
    await engine.update(1)
    expect(onChange).toBeCalledWith('BOEDO')
    onChange.mockClear()
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
    UiInputResult.getMutable(uiEntity).value = 'CASLA'
    await engine.update(1)
    await engine.update(1)
    expect(onChange).toBeCalledWith('CASLA')
    onChange.mockClear()
    UiInputResult.getMutable(uiEntity).value = 'Casla - Boedo'
    conditional = false
    await engine.update(1)
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
  })
})
