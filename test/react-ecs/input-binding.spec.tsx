import { Entity, InputAction, PBUiInputBinding } from '../../packages/@dcl/ecs/src'
import { components } from '../../packages/@dcl/ecs/src'
import { Button, Dropdown, Input, Label, ReactEcs, UiEntity } from '../../packages/@dcl/react-ecs/src'
import { setupEngine, WHOLE_SCREEN } from './utils'

describe('UiInputBinding React Ecs', () => {
  it('should attach, update and remove the UiInputBinding component from a UI element', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiInputBinding = components.UiInputBinding(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getBinding = () => UiInputBinding.getOrNull(rootDivEntity)
    let binding: PBUiInputBinding | undefined = { actions: [InputAction.IA_FORWARD] }

    // The `as any` bridges the test's `@dcl/ecs/src` types with the `@dcl/ecs` (dist)
    // types react-ecs is compiled against — a pre-existing src/dist seam in this suite.
    const ui = () => <UiEntity uiTransform={{ width: 100 }} uiInputBinding={binding as any} />

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    expect(getBinding()).toMatchObject({ actions: [InputAction.IA_FORWARD] })

    // Update the bound actions
    binding = { actions: [InputAction.IA_PRIMARY, InputAction.IA_SECONDARY] }
    await engine.update(1)
    expect(getBinding()).toMatchObject({
      actions: [InputAction.IA_PRIMARY, InputAction.IA_SECONDARY]
    })

    // Remove the component
    binding = undefined
    await engine.update(1)
    expect(getBinding()).toBe(null)
  })
})

/** The binding used by the wrapper-component cases below. */
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

  it('should keep the binding out of every text component', () => {
    // Both Label and Button render a UiText, so checking only the first would miss a
    // regression in the other one.
    const texts = Array.from(engine.getEntitiesWith(UiText)).map(([, text]) => 'uiInputBinding' in text)

    expect(texts).toEqual([false, false])
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

describe('when a disabled Button is given a uiInputBinding', () => {
  let engine: ReturnType<typeof setupEngine>['engine']
  let UiInputBinding: ReturnType<typeof components.UiInputBinding>

  beforeEach(async () => {
    const setup = setupEngine()
    engine = setup.engine
    UiInputBinding = components.UiInputBinding(engine)

    setup.uiRenderer.setUiRenderer(
      () => (
        <UiEntity uiTransform={{ width: 100 }}>
          <Button value="a button" disabled uiInputBinding={BINDING} />
        </UiEntity>
      ),
      WHOLE_SCREEN
    )
    await engine.update(1)
  })

  it('should not bind the action, the same way it drops its mouse handlers', () => {
    expect(Array.from(engine.getEntitiesWith(UiInputBinding))).toHaveLength(0)
  })
})
