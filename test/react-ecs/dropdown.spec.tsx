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
  Dropdown,
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

  const UiDropdown = components.UiDropdown(engine as IEngine)
  const UiDropdownResult = components.UiDropdownResult(engine as IEngine)
  const uiEntity = ((engine.addEntity() as number) + 1) as Entity
  const onChange: jest.Mock | undefined = jest.fn()
  const undefinedChange: jest.Mock | undefined = undefined
  let conditional = true
  let removeComponent = false
  let acceptEmpty = true

  const ui = () => (
    <UiEntity>
      {!removeComponent && (
        <Dropdown
          uiTransform={{
            width: 100
          }}
          acceptEmpty={acceptEmpty}
          emptyLabel={'Select your team (BOEDO)'}
          options={['BOEDO', 'CASLA', 'SAN LORENZO']}
          color={Color4.Red()}
          textAlign="bottom-center"
          font="sans-serif"
          fontSize={14}
          onChange={conditional ? onChange : undefinedChange}
        />
      )}
    </UiEntity>
  )

  it('should validate default props', async () => {
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(UiDropdown.get(uiEntity).selectedIndex).toBe(-1)
    expect(UiDropdown.get(uiEntity).disabled).toBe(false)
    expect(UiDropdown.get(uiEntity).options).toStrictEqual([
      'BOEDO',
      'CASLA',
      'SAN LORENZO'
    ])
    acceptEmpty = false
    await engine.update(1)
    expect(UiDropdown.get(uiEntity).selectedIndex).toBe(0)
  })
  it('onChange should not be called if there is no DropdownResult', async () => {
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
    UiDropdownResult.create(uiEntity).value = 1
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
  })
})
