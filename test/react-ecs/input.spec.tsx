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
  Input
} from '../../packages/@dcl/react-ecs/src'
import { Color4 } from '../../packages/@dcl/sdk/math'
import { UiEntity } from '../../packages/@dcl/sdk/react-ecs'

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

  it('should run onChange if it was a keyboard event', async () => {
    const UiInputResult = components.UiInputResult(engine as IIEngine)
    const uiEntity = ((engine.addEntity() as number) + 1) as Entity
    const onChange: jest.Mock | undefined = jest.fn()
    const undefinedChange: jest.Mock | undefined = undefined
    let conditional = true
    let removeComponent = false
    const ui = () => {
      return (
        !removeComponent && (
          <Input
            uiTransform={{
              width: 100
            }}
            placeholderColor={Color4.Blue()}
            placeholder="Boedo its carnaval"
            disabled={false}
            color={Color4.Red()}
            textAlign={TextAlignMode.TAM_BOTTOM_CENTER}
            font={Font.F_SANS_SERIF}
            fontSize={14}
            onChange={conditional ? onChange : undefinedChange}
          />
        )
      )
    }
    uiRenderer.setUiRenderer(ui)

    expect(onChange).toBeCalledTimes(0)
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
    UiInputResult.create(uiEntity, { value: 'BOEDO' })
    await engine.update(1)
    expect(onChange).toBeCalledWith('BOEDO')
    onChange.mockClear()
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
    UiInputResult.getMutable(uiEntity).value = 'CASLA'
    await engine.update(1)
    expect(onChange).toBeCalledWith('CASLA')
    onChange.mockClear()
    conditional = false
    await engine.update(1)
    UiInputResult.getMutable(uiEntity).value = 'Casla - Boedo'
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
    UiInputResult.getMutable(uiEntity).value = 'Casla - Boedo'
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
    conditional = true
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
    UiInputResult.getMutable(uiEntity).value = 'Casla - '
    await engine.update(1)
    expect(onChange).toBeCalledWith('Casla - ')
    onChange.mockClear()
    removeComponent = true
    await engine.update(1)
    UiInputResult.create(uiEntity, { value: 'BOEDO' })
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
  })
})
