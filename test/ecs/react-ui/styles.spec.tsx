import { Engine, IEngine, Entity } from '../../../packages/@dcl/ecs/src/engine'
import {
  Color4,
  ReactEcs,
  renderUi,
  UiEntity
} from '../../../packages/@dcl/react-ecs/src'

const CANVAS_ROOT_ENTITY = 7
declare const engine: IEngine

describe('UiText React Ecs', () => {
  beforeEach(() => {
    ;(globalThis as any).engine = Engine()
  })

  it('should generate a UI and update the width of a div', async () => {
    const { UiTransform, UiStyles } = engine.baseComponents
    const entityIndex = engine.addEntity()

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getDiv = (entity: Entity) => UiTransform.get(entity)
    const getStyles = (entity: Entity) => UiStyles.get(entity)
    let backgroundColor: Color4 | undefined = { r: 0, g: 1, b: 2, a: 0 }

    const ui = () => (
      <UiEntity uiTransform={{ width: 100 }} uiStyles={{ backgroundColor }} />
    )

    renderUi(ui)
    engine.update(1)

    expect(getDiv(rootDivEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 100
    })

    expect(getStyles(rootDivEntity)).toMatchObject({
      backgroundColor: { r: 0, g: 1, b: 2, a: 0 }
    })

    // Update values
    backgroundColor.g = 20.8

    engine.update(1)
    expect(getStyles(rootDivEntity)).toMatchObject({
      backgroundColor: { r: 0, g: 20.8, b: 2 }
    })

    backgroundColor = undefined
    engine.update(1)
    expect(getStyles(rootDivEntity)).toMatchObject({
      backgroundColor: undefined
    })
  })
})
