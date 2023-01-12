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
  ReactEcs,
  createReactBasedUiSystem,
  Button,
  CANVAS_ROOT_ENTITY,
  UiButtonProps
} from '../../packages/@dcl/react-ecs/src'
import { Color4 } from '../../packages/@dcl/sdk/math'

describe('Button React Ecs', () => {
  it('validates button props', async () => {
    const engine = Engine()
    const input = createInputSystem(engine)
    const pointerEventSystem = createPointerEventSystem(engine, input)
    const renderer = createReactBasedUiSystem(engine, pointerEventSystem)
    const UiTransform = components.UiTransform(engine as IEngine)
    const UiText = components.UiText(engine as IEngine)
    const UiBackground = components.UiBackground(engine as IEngine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const getText = (entity: Entity) => UiText.get(entity)
    const getBackground = (entity: Entity) => UiBackground.getOrNull(entity)
    let text = 'CASLA'
    let color: Color4 | undefined = undefined
    let type: UiButtonProps['type'] = 'primary'
    const ui = () => (
      <Button
        type={type}
        uiTransform={{ width: 100 }}
        value={text}
        color={color}
        font={Font.F_SANS_SERIF}
        textAlign={TextAlignMode.TAM_BOTTOM_CENTER}
      />
    )

    renderer.setUiRenderer(ui)
    await engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 100,
      height: 36
    })

    expect(getBackground(rootDivEntity)).toMatchObject({
      color: { r: 0.98, g: 0.17, b: 0.33, a: 1 }
    })

    expect(getText(rootDivEntity)).toMatchObject({
      value: 'CASLA',
      color: undefined,
      font: Font.F_SANS_SERIF,
      textAlign: TextAlignMode.TAM_BOTTOM_CENTER
    })

    type = 'secondary'
    // Update values
    text = 'BOEDO'
    color = { r: 1, g: 1, b: 1, a: 1 }

    await engine.update(1)
    expect(getText(rootDivEntity)).toMatchObject({
      value: 'BOEDO',
      color: { r: 1, g: 1, b: 1, a: 1 }
    })
    expect(getBackground(rootDivEntity)).toMatchObject({
      color: { r: 1, g: 1, b: 1, a: 1 }
    })

    type = undefined
    await engine.update(1)
    expect(getBackground(rootDivEntity)).toBe(null)
  })
})
