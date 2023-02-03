import { Entity, TextAlignMode, Font } from '../../packages/@dcl/ecs'
import { components } from '../../packages/@dcl/ecs/src'
import { ReactEcs, Label, UiFontType, TextAlignType } from '../../packages/@dcl/react-ecs/src'
import { CANVAS_ROOT_ENTITY } from '../../packages/@dcl/react-ecs/src/components/uiTransform'
import { Color4 } from '../../packages/@dcl/sdk/math'
import { setupEngine } from './utils'

describe('UiText React Ecs', () => {
  it('should generate a UI and update the width of a div', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const UiText = components.UiText(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const getText = (entity: Entity) => UiText.get(entity)
    let text = 'CASLA'
    let color: Color4 | undefined = undefined
    let font: UiFontType | undefined = 'sans-serif'
    let textAlign: TextAlignType | undefined = 'bottom-center'
    const ui = () => <Label uiTransform={{ width: 100 }} value={text} color={color} font={font} textAlign={textAlign} />

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 100
    })

    expect(getText(rootDivEntity)).toMatchObject({
      value: 'CASLA',
      color: undefined,
      font: Font.F_SANS_SERIF,
      textAlign: TextAlignMode.TAM_BOTTOM_CENTER
    })

    // Update values
    text = 'BOEDO'
    color = { r: 1, g: 1, b: 1, a: 1 }
    font = undefined
    textAlign = undefined
    await engine.update(1)
    expect(getText(rootDivEntity)).toMatchObject({
      value: 'BOEDO',
      color: { r: 1, g: 1, b: 1, a: 1 },
      font: 0,
      textAlign: undefined
    })
    await engine.update(1)
  })
})
