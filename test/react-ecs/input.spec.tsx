import { Entity } from '../../packages/@dcl/ecs'
import { components } from '../../packages/@dcl/ecs/src'
import { ReactEcs, Input } from '../../packages/@dcl/react-ecs/src'
import { Color4 } from '../../packages/@dcl/sdk/math'
import { setupEngine } from './utils'

describe('Ui Input - smooth typing', () => {
  it('should not echo back the same value the renderer reported, preventing keystroke drops', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiInput = components.UiInput(engine)
    const UiInputResult = components.UiInputResult(engine)
    const uiEntity = ((engine.addEntity() as number) + 1) as Entity

    let inputValue = ''
    const ui = () => (
      <Input
        uiTransform={{ width: 100 }}
        value={inputValue}
        onChange={(val) => { inputValue = val ?? '' }}
        placeholder="type here"
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    // Simulate the renderer reporting that the user typed "hello"
    UiInputResult.create(uiEntity, { value: 'hello' })
    await engine.update(1)
    expect(inputValue).toBe('hello')

    // React re-renders with value="hello" (echoing it back).
    // The reconciler should strip the echoed value from the update,
    // so the component's value on the ECS side stays unchanged (not overwritten).
    const valueBefore = UiInput.get(uiEntity).value
    await engine.update(1)
    expect(UiInput.get(uiEntity).value).toBe(valueBefore)
  })

  it('should still allow programmatic value changes that differ from renderer state', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiInput = components.UiInput(engine)
    const UiInputResult = components.UiInputResult(engine)
    const uiEntity = ((engine.addEntity() as number) + 1) as Entity

    let inputValue = ''
    const ui = () => (
      <Input
        uiTransform={{ width: 100 }}
        value={inputValue}
        onChange={(val) => { inputValue = val ?? '' }}
        placeholder="type here"
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    UiInputResult.create(uiEntity, { value: 'hello' })
    await engine.update(1)
    expect(inputValue).toBe('hello')

    inputValue = ''
    await engine.update(1)
    expect(UiInput.get(uiEntity).value).toBe('')
  })
})

describe('Ui Listeners React Ecs', () => {
  it('should run onChange if it was a keyboard event', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiInputResult = components.UiInputResult(engine)
    const uiEntity = ((engine.addEntity() as number) + 1) as Entity
    const onChange: jest.Mock | undefined = jest.fn()
    const onSubmit: jest.Mock | undefined = jest.fn()
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
            textAlign="bottom-center"
            font="sans-serif"
            fontSize={14}
            onChange={conditional ? onChange : undefinedChange}
            onSubmit={onSubmit}
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
    expect(onSubmit).toBeCalledTimes(0)
    UiInputResult.getMutable(uiEntity).isSubmit = true
    await engine.update(1)
    expect(onSubmit).toBeCalledTimes(1)
    onChange.mockClear()
    removeComponent = true
    await engine.update(1)
    UiInputResult.create(uiEntity, { value: 'BOEDO' })
    await engine.update(1)
    expect(onChange).toBeCalledTimes(0)
  })
})
