import { InputAction, PBUiInputBinding, components } from '../../packages/@dcl/ecs/src'
import { Button, Dropdown, Input, Label, ReactEcs, UiEntity } from '../../packages/@dcl/react-ecs/src'
import { setupEngine, WHOLE_SCREEN } from './utils'

const BINDING: PBUiInputBinding = { actions: [InputAction.IA_JUMP] }

describe('when every component is given a uiInputBinding', () => {
  let engine: ReturnType<typeof setupEngine>['engine']
  let UiInputBinding: ReturnType<typeof components.UiInputBinding>
  let UiText: ReturnType<typeof components.UiText>
  let UiInput: ReturnType<typeof components.UiInput>
  let UiDropdown: ReturnType<typeof components.UiDropdown>

  beforeEach(async () => {
    const setup = setupEngine()
    engine = setup.engine
    UiInputBinding = components.UiInputBinding(engine)
    UiText = components.UiText(engine)
    UiInput = components.UiInput(engine)
    UiDropdown = components.UiDropdown(engine)

    setup.uiRenderer.setUiRenderer(
      () => (
        <UiEntity uiTransform={{ width: 100 }}>
          <Label value="a label" uiInputBinding={BINDING} />
          <Button value="a button" uiInputBinding={BINDING} />
          <Input uiInputBinding={BINDING} />
          <Dropdown options={['one']} uiInputBinding={BINDING} />
        </UiEntity>
      ),
      WHOLE_SCREEN
    )
    await engine.update(1)
  })

  it('should attach the binding to each of them', () => {
    expect(Array.from(engine.getEntitiesWith(UiInputBinding))).toHaveLength(4)
  })

  it('should bind the actions that were asked for', () => {
    const [, binding] = Array.from(engine.getEntitiesWith(UiInputBinding))[0]

    expect(binding.actions).toEqual([InputAction.IA_JUMP])
  })

  it('should keep the binding out of the text component', () => {
    const [, text] = Array.from(engine.getEntitiesWith(UiText))[0]

    expect('uiInputBinding' in text).toBe(false)
  })

  it('should keep the binding out of the input component', () => {
    const [, input] = Array.from(engine.getEntitiesWith(UiInput))[0]

    expect('uiInputBinding' in input).toBe(false)
  })

  it('should keep the binding out of the dropdown component', () => {
    const [, dropdown] = Array.from(engine.getEntitiesWith(UiDropdown))[0]

    expect('uiInputBinding' in dropdown).toBe(false)
  })
})

describe('when a component is given no uiInputBinding', () => {
  let engine: ReturnType<typeof setupEngine>['engine']
  let UiInputBinding: ReturnType<typeof components.UiInputBinding>

  beforeEach(async () => {
    const setup = setupEngine()
    engine = setup.engine
    UiInputBinding = components.UiInputBinding(engine)

    setup.uiRenderer.setUiRenderer(() => <Label value="a label" />, WHOLE_SCREEN)
    await engine.update(1)
  })

  it('should attach no binding', () => {
    expect(Array.from(engine.getEntitiesWith(UiInputBinding))).toHaveLength(0)
  })
})
