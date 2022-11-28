import { Engine, Entity, components, createPointerEventSystem, createInputSystem } from '../../packages/@dcl/ecs/src'
import { Color4, Font, ReactEcs, createReactBasedUiSystem, TextAlignMode, UiEntity } from '../../packages/@dcl/sdk/react-ecs/src'
import { CANVAS_ROOT_ENTITY } from '../../packages/@dcl/sdk/react-ecs/src/components/uiTransform'

describe('UiText React Ecs', () => {
  beforeEach(() => {
  })

  it('should generate a UI and update the width of a div', async () => {
    const engine = Engine()
    const input = createInputSystem(engine)
    const pointerEventSystem = createPointerEventSystem(engine, input)
    const renderer = createReactBasedUiSystem(engine as any, pointerEventSystem as any)
    const UiTransform = components.UiTransform(engine)
    const UiText = components.UiText(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const getText = (entity: Entity) => UiText.get(entity)
    let text = 'CASLA'
    let color: Color4 | undefined = undefined

    const ui = () => (
      <UiEntity
        uiTransform={{ width: 100 }}
        uiText={{
          value: text,
          color,
          font: Font.F_LIBERATION_SANS,
          textAlign: TextAlignMode.TAM_BOTTOM_CENTER
        }}
      />
    )

    renderer.setUiRenderer(ui)
    engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 100
    })

    expect(getText(rootDivEntity)).toMatchObject({
      value: 'CASLA',
      color: undefined,
      font: Font.F_LIBERATION_SANS,
      textAlign: TextAlignMode.TAM_BOTTOM_CENTER
    })

    // Update values
    text = 'BOEDO'
    color = { r: 1, g: 1, b: 1, a: 1 }

    engine.update(1)
    expect(getText(rootDivEntity)).toMatchObject({
      value: 'BOEDO',
      color: { r: 1, g: 1, b: 1, a: 1 }
    })
    engine.update(1)
  })
})
