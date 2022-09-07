import { Engine, Entity } from '../../../packages/@dcl/ecs/src/engine'
import { DivUi, ReactEcs } from '../../../packages/@dcl/react-ecs/src'

describe('Remove UI', () => {
  it('should remove the ui and the entities', () => {
    const ui = () => <DivUi width={1} />
    const engine = Engine()
    const { UiTransform } = engine.baseComponents
    const entityIndex = engine.addEntity()
    const getDiv = (entity: Entity) => UiTransform.getOrNull(entity)
    const divEntity = (entityIndex + 1) as Entity

    const uiIndex = engine.renderUI(ui)
    engine.update(1)
    expect(getDiv(divEntity)?.width).toBe(1)
    engine.removeUI(uiIndex)
    engine.update(1)
    expect(getDiv(divEntity)).toBe(null)
  })

  it('should do nothing if you remove an unexisting ui', () => {
    const engine = Engine()
    expect(engine.removeUI(12312321)).toBeUndefined()
  })
})
