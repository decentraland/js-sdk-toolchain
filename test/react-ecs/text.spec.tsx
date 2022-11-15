import { Engine, IEngine, Entity } from '../../packages/@dcl/ecs/src/engine'
import {
  Color3,
  Color4,
  Font,
  ReactEcs,
  renderUi,
  TextAlignMode,
  UiEntity
} from '../../packages/@dcl/react-ecs/src'

const CANVAS_ROOT_ENTITY = 0
declare const engine: IEngine

describe('UiText React Ecs', () => {
  beforeEach(() => {
    ;(globalThis as any).engine = Engine()
  })

  it('should generate a UI and update the width of a div', async () => {
    const { UiTransform, UiText } = engine.baseComponents
    const entityIndex = engine.addEntity()

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getDiv = (entity: Entity) => UiTransform.get(entity)
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

    renderUi(ui)
    engine.update(1)

    expect(getDiv(rootDivEntity)).toMatchObject({
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
