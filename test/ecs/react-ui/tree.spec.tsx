import { Engine, Entity } from '../../../packages/@dcl/ecs/src/engine'
import { DivUi, ReactEcs } from '../../../packages/@dcl/react-ecs/src'
;(globalThis as any).ReactEcs = ReactEcs

describe('UI Mockup', () => {
  it('should generate a UI and update the width of a div', async () => {
    const engine = Engine()
    const { UiTransform } = engine.baseComponents
    const entityIndex = engine.addEntity()

    // Helpers
    const divAChildEntity = (entityIndex + 1) as Entity
    const divAEntity = (entityIndex + 2) as Entity
    const divBEntity = (entityIndex + 3) as Entity
    const rootDivEntity = (entityIndex + 4) as Entity

    const getDiv = (entity: Entity) => UiTransform.get(entity)

    let width = 222

    const ui = () => (
      <DivUi width={111}>
        {/* // Root */}
        <DivUi width={width}>
          <DivUi width={222.1} />
        </DivUi>
        {/* DivA */}
        <DivUi width={333} />
        {/* DivB */}
      </DivUi>
    )
    engine.renderUI(ui)
    engine.update(1)
    expect(getDiv(rootDivEntity)).toMatchObject({
      parent: 0,
      rightOf: 0, // TODO: undefined
      width: 111
    })
    expect(getDiv(divAChildEntity)).toMatchObject({
      parent: divAEntity,
      rightOf: undefined,
      width: 222.1
    })
    expect(getDiv(divAEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: undefined,
      width: 222
    })
    expect(getDiv(divBEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAEntity,
      width: 333
    })

    // Update width prop and see if it has changed
    width = 400
    engine.update(1)

    expect(UiTransform.isDirty(divAChildEntity)).toBe(false)
    expect(UiTransform.isDirty(rootDivEntity)).toBe(false)
    expect(UiTransform.isDirty(divBEntity)).toBe(false)
    expect(getDiv(divAEntity).width).toBe(400)
  })
  it('should add a child at the beggining and then remove it', async () => {
    const engine = Engine()
    const { UiTransform } = engine.baseComponents
    const entityIndex = engine.addEntity()

    // Helpers
    const rootDivEntity = (entityIndex + 3) as Entity
    const divAEntity = (entityIndex + 1) as Entity
    const divBEntity = (entityIndex + 2) as Entity
    const divAddedEntity = (entityIndex + 4) as Entity

    const getDiv = (entity: Entity) => UiTransform.get(entity)
    let addChild = false
    const ui = () => {
      return (
        <DivUi width={111}>
          {addChild && <DivUi width={333} />}
          {/* // Root */}
          <DivUi width={888} />
          {/* DivA */}
          <DivUi width={999} />
          {/* DivB */}
        </DivUi>
      )
    }

    engine.renderUI(ui)
    engine.update(1)

    expect(getDiv(rootDivEntity)).toMatchObject({
      parent: 0,
      rightOf: 0, // TODO: undefined
      width: 111
    })
    expect(getDiv(divAEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: undefined,
      width: 888
    })
    expect(getDiv(divBEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAEntity,
      width: 999
    })

    addChild = true
    engine.update(1)

    // Root div doesn't have to change
    expect(UiTransform.isDirty(rootDivEntity)).toBe(false)

    // Div added must be the first element.
    expect(getDiv(divAddedEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: undefined,
      width: 333
    })

    // Update DivA rightOf prop with divAdded entity
    expect(getDiv(divAEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAddedEntity,
      width: 888
    })

    // DivB must remain the same
    expect(getDiv(divBEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAEntity,
      width: 999
    })

    // Remove divAdded and check that all goes back to the first iteration
    addChild = false
    engine.update(1)

    expect(getDiv(rootDivEntity)).toMatchObject({
      parent: 0,
      rightOf: 0,
      width: 111
    })
    expect(getDiv(divAEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: undefined,
      width: 888
    })
    expect(getDiv(divBEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAEntity,
      width: 999
    })
    expect(UiTransform.getOrNull(divAddedEntity)).toBe(null)
  })
  it('should add a child at the middle and then remove it', async () => {
    const engine = Engine()
    const { UiTransform } = engine.baseComponents
    const entityIndex = engine.addEntity()

    // Helpers
    const rootDivEntity = (entityIndex + 3) as Entity
    const divAEntity = (entityIndex + 1) as Entity
    const divBEntity = (entityIndex + 2) as Entity
    const divAddedEntity = (entityIndex + 4) as Entity

    const getDiv = (entity: Entity) => UiTransform.get(entity)
    let addChild = false
    const ui = () => (
      <DivUi width={111}>
        {/* // Root */}
        <DivUi width={888} />
        {/* DivA */}
        {addChild && <DivUi width={333} />}
        {/* DivAdded */}
        <DivUi width={999} />
        {/* DivB */}
      </DivUi>
    )
    engine.renderUI(ui)
    engine.update(1)

    expect(getDiv(divAEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: undefined,
      width: 888
    })
    expect(getDiv(divBEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAEntity,
      width: 999
    })

    addChild = true
    engine.update(1)

    expect(getDiv(divAddedEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAEntity,
      width: 333
    })

    // DivB must be updated with rightOf
    expect(getDiv(divBEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAddedEntity,
      width: 999
    })

    // Root div doesn't have to change
    expect(getDiv(rootDivEntity)).toMatchObject({
      parent: 0,
      rightOf: 0,
      width: 111
    })
    // Div A doesn't have to change
    expect(getDiv(divAEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: undefined,
      width: 888
    })

    // Remove divAdded and check that all goes back to the first iteration
    addChild = false
    engine.update(1)

    expect(getDiv(rootDivEntity)).toMatchObject({
      parent: 0,
      rightOf: 0,
      width: 111
    })
    expect(getDiv(divAEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: undefined,
      width: 888
    })
    expect(getDiv(divBEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAEntity,
      width: 999
    })
    expect(UiTransform.getOrNull(divAddedEntity)).toBe(null)
  })
  it('should add a child at the end and then remove it', async () => {
    const engine = Engine()
    const { UiTransform } = engine.baseComponents
    const entityIndex = engine.addEntity()

    // Helpers
    const rootDivEntity = (entityIndex + 3) as Entity
    const divAEntity = (entityIndex + 1) as Entity
    const divBEntity = (entityIndex + 2) as Entity
    const divAddedEntity = (entityIndex + 4) as Entity

    const getDiv = (entity: Entity) => UiTransform.get(entity)

    let addChild = false
    const ui = () => (
      <DivUi width={111}>
        {/* // Root */}
        <DivUi width={888} />
        {/* DivA */}
        <DivUi width={999} />
        {/* DivB */}
        {addChild && <DivUi width={333} />}
        {/* DivAdded */}
      </DivUi>
    )
    engine.renderUI(ui)
    engine.update(1)
    expect(getDiv(rootDivEntity)).toMatchObject({
      parent: 0,
      rightOf: 0,
      width: 111
    })
    expect(getDiv(divAEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: undefined,
      width: 888
    })
    expect(getDiv(divBEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAEntity,
      width: 999
    })

    // Update addChild value
    addChild = true
    engine.update(1)
    expect(getDiv(divAddedEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divBEntity,
      width: 333
    })

    // Divs must not change
    expect(getDiv(divBEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAEntity,
      width: 999
    })
    expect(getDiv(rootDivEntity)).toMatchObject({ parent: 0, rightOf: 0 })
    expect(getDiv(divAEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: undefined,
      width: 888
    })

    // Remove divAdded and check that all goes back to the first iteration
    addChild = false
    engine.update(1)

    expect(getDiv(divBEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAEntity,
      width: 999
    })
    expect(getDiv(rootDivEntity)).toMatchObject({ parent: 0, rightOf: 0 })
    expect(getDiv(divAEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: undefined,
      width: 888
    })
    expect(UiTransform.getOrNull(divAddedEntity)).toBe(null)
  })
  it('should add a child at the middle with multiple childs and then remove it', async () => {
    const engine = Engine()
    const { UiTransform } = engine.baseComponents
    const entityIndex = engine.addEntity()

    // Helpers
    const rootDivEntity = (entityIndex + 3) as Entity
    const divAEntity = (entityIndex + 1) as Entity
    const divBEntity = (entityIndex + 2) as Entity
    const divAddedAChildEntity = (entityIndex + 4) as Entity
    const divAddedAEntity = (entityIndex + 5) as Entity
    const divAddedBEntity = (entityIndex + 6) as Entity
    const divAddedRootEntity = (entityIndex + 7) as Entity

    const getDiv = (entity: Entity) => UiTransform.get(entity)
    let width = 333.2
    let addChild = false
    const ui = () => (
      <DivUi width={111}>
        {/* // Root */}
        <DivUi width={888} />
        {/* DivA */}
        {addChild && (
          <DivUi width={333}>
            <DivUi width={333.1}>
              <DivUi width={333.11} />
            </DivUi>
            <DivUi width={width} />
          </DivUi>
        )}
        {/* DivAdded */}
        <DivUi width={999} />
        {/* DivB */}
      </DivUi>
    )
    engine.renderUI(ui)
    engine.update(1)

    addChild = true
    engine.update(1)

    // Add child divs
    expect(getDiv(divAddedRootEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAEntity,
      width: 333
    })
    expect(getDiv(divAddedAEntity)).toMatchObject({
      parent: divAddedRootEntity,
      rightOf: undefined,
      width: 333.1
    })
    expect(getDiv(divAddedAChildEntity)).toMatchObject({
      parent: divAddedAEntity,
      rightOf: undefined,
      width: 333.11
    })
    expect(getDiv(divAddedBEntity)).toMatchObject({
      parent: divAddedRootEntity,
      rightOf: divAddedAEntity,
      width: 333.2
    })

    // DivB must be updated with rightOf
    expect(getDiv(divBEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAddedRootEntity,
      width: 999
    })
    // Root div doesn't have to change
    expect(getDiv(rootDivEntity)).toMatchObject({
      parent: 0,
      rightOf: 0,
      width: 111
    })
    // Div A doesn't have to change
    expect(getDiv(divAEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: undefined,
      width: 888
    })

    // Remove divAdded and check that all goes back to the first iteration
    width = 333.22
    addChild = false
    engine.update(1)
    expect(getDiv(divBEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: divAEntity,
      width: 999
    })
    expect(UiTransform.getOrNull(divAddedRootEntity)).toBe(null)
    expect(UiTransform.getOrNull(divAddedAEntity)).toBe(null)
    expect(UiTransform.getOrNull(divAddedBEntity)).toBe(null)
  })
  it('should iterate the array on every tick and update values', async () => {
    const engine = Engine()
    const { UiTransform } = engine.baseComponents
    const entityIndex = engine.addEntity()

    // Helpers
    const divArray = [
      { id: 1, value: 1 },
      { id: 2, value: 2 },
      { id: 3, value: 3 }
    ]

    const rootDivEntity = (entityIndex + divArray.length + 1) as Entity
    const div1Entity = (entityIndex + 1) as Entity
    const div2Entity = (entityIndex + 2) as Entity
    const div3Entity = (entityIndex + 3) as Entity

    const getDiv = (entity: number) => UiTransform.get(entity as Entity)
    const ui = () => (
      <DivUi width={111}>
        {divArray.map((div) => (
          <DivUi key={div.id} width={div.value} />
        ))}
      </DivUi>
    )
    engine.renderUI(ui)
    engine.update(1)

    expect(getDiv(div1Entity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: undefined,
      width: 1
    })
    expect(getDiv(div2Entity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: div1Entity,
      width: 2
    })
    expect(getDiv(div3Entity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: div2Entity,
      width: 3
    })
    expect(getDiv(rootDivEntity)).toMatchObject({
      parent: 0,
      rightOf: 0,
      width: 111
    })

    // Add an element to the array
    divArray.push({ id: 4, value: 4 })
    engine.update(1)

    const div4Entity = (rootDivEntity + 1) as Entity
    // Divs doesnt change
    expect(getDiv(div1Entity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: undefined,
      width: 1
    })
    expect(getDiv(div2Entity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: div1Entity,
      width: 2
    })
    expect(getDiv(div3Entity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: div2Entity,
      width: 3
    })
    expect(getDiv(rootDivEntity)).toMatchObject({
      parent: 0,
      rightOf: 0,
      width: 111
    })
    // Add div4
    expect(getDiv(div4Entity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: div3Entity,
      width: 4
    })

    // Update first elemnt of the array
    divArray[0] = { ...divArray[0], value: 111 }
    engine.update(1)
    expect(getDiv(div1Entity).width).toBe(111)

    // Remove div2 and div3 entities
    divArray.splice(1, 2)
    engine.update(1)

    expect(UiTransform.getOrNull(div2Entity)).toBe(null)
    expect(UiTransform.getOrNull(div3Entity)).toBe(null)
    expect(getDiv(div4Entity)).toMatchObject({ rightOf: div1Entity, width: 4 })

    // Add an element at the beginning of the array
    divArray.unshift({ id: 8, value: 8 })
    engine.update(1)
    const newDivEntity = (div4Entity + 1) as Entity
    // Divs doesnt change

    expect(getDiv(div1Entity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: newDivEntity,
      width: 111
    })
    expect(getDiv(rootDivEntity)).toMatchObject({
      parent: 0,
      rightOf: 0,
      width: 111
    })
    expect(getDiv(div4Entity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: div1Entity,
      width: 4
    })
    expect(getDiv(newDivEntity)).toMatchObject({
      parent: rootDivEntity,
      rightOf: undefined,
      width: 8
    })
  })
})
