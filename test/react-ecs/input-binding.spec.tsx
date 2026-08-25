import { Entity, InputAction, PBUiInputBinding } from '../../packages/@dcl/ecs/src'
import { components } from '../../packages/@dcl/ecs/src'
import { ReactEcs, UiEntity } from '../../packages/@dcl/react-ecs/src'
import { setupEngine } from './utils'

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
