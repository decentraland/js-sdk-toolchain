import { Engine, IEngine, Entity } from '../../packages/@dcl/ecs/src/engine'
import {
  UiEntity,
  ReactEcs,
  renderUi,
  removeUi
} from '../../packages/@dcl/react-ecs/src'

declare const engine: IEngine

describe('Render UI System', () => {
  beforeEach(() => {
    ;(globalThis as any).engine = Engine()
  })

  it('should remove the ui and the entities', () => {
    const ui = () => <UiEntity uiTransform={{ width: 1 }} />
    const { UiTransform } = engine.baseComponents
    const entityIndex = engine.addEntity()
    const getDiv = (entity: Entity) => UiTransform.getOrNull(entity)
    const divEntity = (entityIndex + 1) as Entity

    const uiIndex = renderUi(ui)
    engine.update(1)
    expect(getDiv(divEntity)?.width).toBe(1)

    removeUi(uiIndex)
    engine.update(1)
    expect(getDiv(divEntity)).toBe(null)
  })

  it('should do nothing if you remove an unexisting ui', () => {
    expect(removeUi(12312321)).toBeUndefined()
  })
})
