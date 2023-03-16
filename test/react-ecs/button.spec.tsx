import { Entity, Font, TextAlignMode } from '../../packages/@dcl/ecs/dist'
import { components } from '../../packages/@dcl/ecs/src'
import { ReactEcs, Button, UiButtonProps } from '../../packages/@dcl/react-ecs/src'
import { CANVAS_ROOT_ENTITY } from '../../packages/@dcl/react-ecs/src/components/uiTransform'
import { Color4 } from '../../packages/@dcl/sdk/math'
import { setupEngine } from './utils'

describe('Button React Ecs', () => {
  it('validates button props', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const UiText = components.UiText(engine)
    const UiBackground = components.UiBackground(engine)
    const uiPointerEvent = components.PointerEvents(engine)
    const entityIndex = engine.addEntity() as number
    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const getText = (entity: Entity) => UiText.get(entity)
    const getBackground = (entity: Entity) => UiBackground.getOrNull(entity)
    const getPointerEvent = (entity: Entity) => uiPointerEvent.getOrNull(entity)

    let text = 'CASLA'
    const color: { color?: Color4 } = {}
    let type: UiButtonProps['variant'] = 'primary'
    let disabled: boolean = false
    const ui = () => (
      <Button
        variant={type}
        uiTransform={{ width: 100 }}
        value={text}
        font="sans-serif"
        textAlign="bottom-center"
        disabled={disabled}
        {...color}
      />
    )

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    expect(getPointerEvent(rootDivEntity)).toBeDefined()
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
      color: { r: 1, g: 1, b: 1, a: 1 },
      font: Font.F_SANS_SERIF,
      textAlign: TextAlignMode.TAM_BOTTOM_CENTER
    })

    // Update values
    type = 'secondary' // changes background color to white
    text = 'BOEDO'
    color.color = { r: 1, g: 0.2, b: 0.3, a: 1 } // changes text color
    disabled = true // changes text and background color alpha value

    await engine.update(1)
    expect(getPointerEvent(rootDivEntity) === null)
    expect(getText(rootDivEntity)).toMatchObject({
      value: 'BOEDO',
      color: { r: 1, g: 0.2, b: 0.3, a: 0.5 }
    })
    expect(getBackground(rootDivEntity)).toMatchObject({
      color: { r: 1, g: 1, b: 1, a: 0.5 }
    })

    type = undefined
    await engine.update(1)
    expect(getBackground(rootDivEntity)).toMatchObject({
      color: { r: 0.98, g: 0.17, b: 0.33, a: 1 / 2 }
    })
  })
})
