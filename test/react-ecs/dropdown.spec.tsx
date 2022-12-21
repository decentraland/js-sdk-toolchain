import {
  Engine,
  Entity,
  createPointerEventSystem,
  createInputSystem,
  TextAlignMode,
  Font
} from '../../packages/@dcl/ecs/dist'
import { components, IEngine } from '../../packages/@dcl/ecs/src'
import {
  createReactBasedUiSystem,
  ReactEcs,
  UiEntity
} from '../../packages/@dcl/react-ecs/src'
import { Color4 } from '../../packages/@dcl/sdk/math'

describe('UiDropdown React ECS', () => {
  const engine = Engine()
  const Input = createInputSystem(engine)
  const uiRenderer = createReactBasedUiSystem(
    engine,
    createPointerEventSystem(engine, Input)
  )

  const UiDropdownResult = components.UiDropdownResult(engine as IEngine)
  const uiEntity = ((engine.addEntity() as number) + 1) as Entity
  const onChange: jest.Mock | undefined = jest.fn()
  const undefinedChange: jest.Mock | undefined = undefined
  let conditional = true
  let removeComponent = false

  const ui = () => (
    <UiEntity
      uiTransform={{
        width: 100
      }}
      uiDropdown={
        !removeComponent
          ? {
              acceptEmpty: true,
              emptyLabel: 'Select your team (BOEDO)',
              options: ['BOEDO', 'CASLA', 'SAN LORENZO'],
              disabled: false,
              color: Color4.Red(),
              textAlign: TextAlignMode.TAM_BOTTOM_CENTER,
              font: Font.F_SANS_SERIF,
              fontSize: 14,
              onChange: conditional ? onChange : undefinedChange
            }
          : undefined
      }
    />
  )
  it('onChange should not be called if there is no DropdownResult', async () => {
    uiRenderer.setUiRenderer(ui)
    expect(onChange).toBeCalledTimes(0)
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
  })

  it('creates a dropdownResult, so now should be called', async () => {
    UiDropdownResult.create(uiEntity, { value: 1 })
    await engine.update(1)
    expect(onChange).toBeCalledWith(1)
  })

  it('reset the onChange mock fn, and update the value with the previous value so there should be no called either', async () => {
    onChange.mockClear()
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
    UiDropdownResult.getMutable(uiEntity).value = 1
    await engine.update(1)
  })

  it('remove the onchange fn, so if we change the value there is no call to the fn because there is no onChange fn', async () => {
    expect(onChange).toBeCalledTimes(0)
    conditional = false
    await engine.update(1)

    UiDropdownResult.getMutable(uiEntity).value = 2
    expect(onChange).toBeCalledTimes(0)
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
  })

  it('put the conditional en true, so we have the onChange fn again', async () => {
    conditional = true
    await engine.update(1)
  })

  it('should call the fn because the previuos store value was 1 and now it has 2', async () => {
    await engine.update(1)
    expect(onChange).toBeCalledTimes(1)
    UiDropdownResult.getMutable(uiEntity).value = 2
    await engine.update(1)
    expect(onChange).toBeCalledWith(2)
    onChange.mockClear()
  })

  it('remove the component and see if the onChange fn is removed', async () => {
    removeComponent = true
    await engine.update(1)
    UiDropdownResult.getMutable(uiEntity).value = 1
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
  })
})
