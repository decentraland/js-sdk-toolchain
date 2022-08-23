import createRenderer from './renderer'
import { Engine, Entity } from '../../src/engine'
import { DivUi } from '../../src/engine/jsx/components'

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('UI Mockup', () => {
  it('Generate a UI and update the width of a div', async () => {
    const engine = Engine()
    const { UiTransform } = engine.baseComponents
    const entityIndex = engine.addEntity()
    const renderer = createRenderer(engine)

    // Helpers
    const rootDivEntity = (entityIndex + 3) as Entity
    const divAEntity = (entityIndex + 1) as Entity
    const divBEntity = (entityIndex + 2) as Entity
    const getDiv = (entity: Entity) => UiTransform.getFrom(entity)

    let width = 300

    const ui = () => (
      <DivUi width={width}>
        {/* // Root */}
        <DivUi width={888} />
        {/* DivA */}
        <DivUi width={999} />
        {/* DivB */}
      </DivUi>
    )

    renderer.update(ui())

    const divA = getDiv(divAEntity)
    const divB = getDiv(divBEntity)
    const rootDiv = getDiv(rootDivEntity)

    expect(rootDiv).toMatchObject({
      parentEntity: 0,
      // nextTo: undefined,
      width: 300
    })
    expect(divA).toMatchObject({
      parentEntity: rootDivEntity,
      // nextTo: undefined,
      width: 888
    })
    expect(divB).toMatchObject({
      parentEntity: rootDivEntity,
      // nextTo: divAEntity,
      width: 999
    })

    // Clean dirties
    engine.update(1)

    // Update width prop and see if it has changed
    width = 400
    renderer.update(ui())
    const rootDivUpdated = getDiv(rootDivEntity)
    expect(UiTransform.isDirty(divAEntity)).toBe(false)
    expect(UiTransform.isDirty(divBEntity)).toBe(false)
    expect(rootDivUpdated.width).toBe(400)
  })
})
