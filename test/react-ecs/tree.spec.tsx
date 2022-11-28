import { components, Engine, IEngine, Entity, createPointerEventSystem, createInputSystem } from '../../packages/@dcl/ecs/src'
import {
  Container,
  createReactBasedUiSystem,
  ReactBasedUiSystem,
  ReactEcs,
  UiEntity,
  CANVAS_ROOT_ENTITY
} from '../../packages/@dcl/sdk/react-ecs'


describe('RectEcs UI ✨', () => {
  let engine: IEngine
  let uiRenderer: ReactBasedUiSystem

  beforeEach(() => {
    engine = Engine()
    uiRenderer = createReactBasedUiSystem(engine as any, createPointerEventSystem(engine, createInputSystem(engine)) as any)
  })


  it('should generate a UI and update the width', async () => {
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as any

    // Helpers
    const childEntity = (entityIndex + 1) as Entity
    const entityA = (entityIndex + 2) as Entity
    const entityB = (entityIndex + 3) as Entity
    const rootEntity = (entityIndex + 4) as Entity

    const getUi = (entity: Entity) => UiTransform.get(entity)

    let width = 222

    const ui = () => (
      <Container width={111}>
        {/* // Root */}
        <Container width={width}>
          <Container width={222.1} />
        </Container>
        {/* UiEntity A */}
        <Container width={333} />
        {/* UiEntity B */}
      </Container>
    )
    uiRenderer.setUiRenderer(ui)
    engine.update(1)
    expect(getUi(rootEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0, // TODO: undefined
      width: 111
    })
    expect(getUi(childEntity)).toMatchObject({
      parent: entityA,
      rightOf: undefined,
      width: 222.1
    })
    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 222
    })
    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 333
    })

    // Update width prop and see if it has changed
    width = 400
    engine.update(1)

    expect(UiTransform.isDirty(childEntity)).toBe(false)
    expect(UiTransform.isDirty(rootEntity)).toBe(false)
    expect(UiTransform.isDirty(entityB)).toBe(false)
    expect(getUi(entityA).width).toBe(400)
  })
  it('should add a child at the beggining and then remove it', async () => {
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as any

    // Helpers
    const rootEntity = (entityIndex + 3) as Entity
    const entityA = (entityIndex + 1) as Entity
    const entityB = (entityIndex + 2) as Entity
    const entityAdded = (entityIndex + 4) as Entity

    const getUi = (entity: Entity) => UiTransform.get(entity)
    let addChild = false
    const ui = () => {
      return (
        <Container width={111}>
          {addChild && <Container width={333} />}
          {/* // Root */}
          <Container width={888} />
          {/* UiEntity A */}
          <Container width={999} />
          {/* UiEntity B */}
        </Container>
      )
    }

    uiRenderer.setUiRenderer(ui)
    engine.update(1)

    expect(getUi(rootEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0, // TODO: undefined
      width: 111
    })
    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 888
    })
    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 999
    })

    addChild = true
    engine.update(1)

    // Root UiEntity doesn't have to change
    expect(UiTransform.isDirty(rootEntity)).toBe(false)

    // Entity added must be the first element.
    expect(getUi(entityAdded)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 333
    })

    // Update A rightOf prop with new entityAdded entity
    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: entityAdded,
      width: 888
    })

    // UiEntity B must remain the same
    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 999
    })

    // Remove addedEntity and check that all goes back to the first iteration
    addChild = false
    engine.update(1)

    expect(getUi(rootEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 111
    })
    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 888
    })
    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 999
    })
    expect(UiTransform.getOrNull(entityAdded)).toBe(null)
  })
  it('should add a child at the middle and then remove it', async () => {
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as any

    // Helpers
    const rootEntity = (entityIndex + 3) as Entity
    const entityA = (entityIndex + 1) as Entity
    const entityB = (entityIndex + 2) as Entity
    const entityAdded = (entityIndex + 4) as Entity

    const getUi = (entity: Entity) => UiTransform.get(entity)
    let addChild = false
    const ui = () => (
      <Container width={111}>
        {/* // Root */}
        <Container width={888} />
        {/* UiEntity A */}
        {addChild && <Container width={333} />}
        {/* UiEntity Added */}
        <Container width={999} />
        {/* UiEntity B */}
      </Container>
    )
    uiRenderer.setUiRenderer(ui)
    engine.update(1)

    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 888
    })
    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 999
    })

    addChild = true
    engine.update(1)

    expect(getUi(entityAdded)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 333
    })

    // UiEntity B must be updated with rightOf
    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityAdded,
      width: 999
    })

    // Root entty doesn't have to change
    expect(getUi(rootEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 111
    })
    // Entity A doesn't have to change
    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 888
    })

    // Remove UiEntity Added and check that all goes back to the first iteration
    addChild = false
    engine.update(1)

    expect(getUi(rootEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 111
    })
    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 888
    })
    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 999
    })
    expect(UiTransform.getOrNull(entityAdded)).toBe(null)
  })
  it('should add a child at the end and then remove it', async () => {
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as any

    // Helpers
    const rootEntity = (entityIndex + 3) as Entity
    const entityA = (entityIndex + 1) as Entity
    const entityB = (entityIndex + 2) as Entity
    const entityAdded = (entityIndex + 4) as Entity

    const getUi = (entity: Entity) => UiTransform.get(entity)

    let addChild = false
    const ui = () => (
      <Container width={111}>
        {/* // Root */}
        <Container width={888} />
        {/* UiEntity A */}
        <Container width={999} />
        {/* UiEntity B */}
        {addChild && <Container width={333} />}
        {/* UiEntity Added */}
      </Container>
    )
    uiRenderer.setUiRenderer(ui)
    engine.update(1)
    expect(getUi(rootEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 111
    })
    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 888
    })
    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 999
    })

    // Update addChild value
    addChild = true
    engine.update(1)
    expect(getUi(entityAdded)).toMatchObject({
      parent: rootEntity,
      rightOf: entityB,
      width: 333
    })

    // Entities must not change
    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 999
    })
    expect(getUi(rootEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0
    })
    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 888
    })

    // Remove UiEntity Added and check that all goes back to the first iteration
    addChild = false
    engine.update(1)

    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 999
    })
    expect(getUi(rootEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0
    })
    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 888
    })
    expect(UiTransform.getOrNull(entityAdded)).toBe(null)
  })
  it('should add a child at the middle with multiple childs and then remove it', async () => {
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootEntity = (entityIndex + 3) as Entity
    const entityA = (entityIndex + 1) as Entity
    const entityB = (entityIndex + 2) as Entity
    const addedAChildEntity = (entityIndex + 4) as Entity
    const addedEntitiyA = (entityIndex + 5) as Entity
    const addedEntityB = (entityIndex + 6) as Entity
    const entityRootAdded = (entityIndex + 7) as Entity

    const getUi = (entity: Entity) => UiTransform.get(entity)
    let width = 333.2
    let addChild = false
    const ui = () => (
      <Container width={111}>
        {/* // Root */}
        <Container width={888} />
        {/* UiEntity A */}
        {addChild && (
          <Container width={333}>
            <Container width={333.1}>
              <Container width={333.11} />
            </Container>
            <Container width={width} />
          </Container>
        )}
        {/* UiEntity Added */}
        <Container width={999} />
        {/* UiEntity B */}
      </Container>
    )

    uiRenderer.setUiRenderer(ui)
    engine.update(1)

    addChild = true
    engine.update(1)

    // Add child entities
    expect(getUi(entityRootAdded)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 333
    })
    expect(getUi(addedEntitiyA)).toMatchObject({
      parent: entityRootAdded,
      rightOf: undefined,
      width: 333.1
    })
    expect(getUi(addedAChildEntity)).toMatchObject({
      parent: addedEntitiyA,
      rightOf: undefined,
      width: 333.11
    })
    expect(getUi(addedEntityB)).toMatchObject({
      parent: entityRootAdded,
      rightOf: addedEntitiyA,
      width: 333.2
    })

    // UiEntity B must be updated with rightOf
    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityRootAdded,
      width: 999
    })
    // Root entity doesn't have to change
    expect(getUi(rootEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 111
    })
    // Entity A doesn't have to change
    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 888
    })

    // Remove UiEntity Added and check that all goes back to the first iteration
    width = 333.22
    addChild = false
    engine.update(1)
    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 999
    })
    expect(UiTransform.getOrNull(entityRootAdded)).toBe(null)
    expect(UiTransform.getOrNull(addedEntitiyA)).toBe(null)
    expect(UiTransform.getOrNull(addedEntityB)).toBe(null)
  })
  it('should iterate the array on every tick and update values', async () => {
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const uiEntities = [
      { id: 1, value: 1 },
      { id: 2, value: 2 },
      { id: 3, value: 3 }
    ]

    const rootEntity = (entityIndex + uiEntities.length + 1) as Entity
    const entityA = (entityIndex + 1) as Entity
    const entityB = (entityIndex + 2) as Entity
    const entityC = (entityIndex + 3) as Entity

    const getUi = (entity: any) => UiTransform.get(entity as Entity)
    const ui = () => (
      <Container width={111}>
        {uiEntities.map((entity) => (
          <Container key={entity.id} width={entity.value} />
        ))}
      </Container>
    )
    uiRenderer.setUiRenderer(ui)
    engine.update(1)

    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 1
    })
    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 2
    })
    expect(getUi(entityC)).toMatchObject({
      parent: rootEntity,
      rightOf: entityB,
      width: 3
    })
    expect(getUi(rootEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 111
    })

    // Add an element to the array
    uiEntities.push({ id: 4, value: 4 })
    engine.update(1)

    const entityD = (rootEntity as number + 1) as Entity

    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 1
    })
    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 2
    })
    expect(getUi(entityC)).toMatchObject({
      parent: rootEntity,
      rightOf: entityB,
      width: 3
    })
    expect(getUi(rootEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 111
    })
    expect(getUi(entityD)).toMatchObject({
      parent: rootEntity,
      rightOf: entityC,
      width: 4
    })

    // Update first elemnt of the array
    uiEntities[0] = { ...uiEntities[0], value: 111 }
    engine.update(1)
    expect(getUi(entityA).width).toBe(111)

    // Remove B and C entities
    uiEntities.splice(1, 2)
    engine.update(1)

    expect(UiTransform.getOrNull(entityB)).toBe(null)
    expect(UiTransform.getOrNull(entityC)).toBe(null)
    expect(getUi(entityD)).toMatchObject({ rightOf: entityA, width: 4 })

    // Add an element at the beginning of the array
    uiEntities.unshift({ id: 8, value: 8 })
    engine.update(1)
    const newEntity = (entityD as number + 1) as Entity
    // Entities props doesnt change

    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: newEntity,
      width: 111
    })
    expect(getUi(rootEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 111
    })
    expect(getUi(entityD)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 4
    })
    expect(getUi(newEntity)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 8
    })
  })

  it('should update rightOf of the array', async () => {
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    let uiEntities: { id: number; value: number }[] = [
      { id: 1, value: 1 },
      { id: 2, value: 2 }
    ]

    const rootEntity = (entityIndex + uiEntities.length + 1) as Entity
    const entityA = (entityIndex + 1) as Entity
    const entityB = (entityIndex + 2) as Entity
    const getUi = (entity: any) => UiTransform.get(entity as Entity)
    const ui = () => (
      <UiEntity uiTransform={{ width: 111 }}>
        {uiEntities.map((props) => (
          <UiEntity key={props.id} uiTransform={{ width: props.value }} />
        ))}
      </UiEntity>
    )
    uiRenderer.setUiRenderer(ui)
    engine.update(1)

    expect(getUi(entityA)).toMatchObject({
      parent: rootEntity,
      rightOf: undefined,
      width: 1
    })
    expect(getUi(entityB)).toMatchObject({
      parent: rootEntity,
      rightOf: entityA,
      width: 2
    })
    expect(getUi(rootEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 111
    })

    const first = uiEntities.shift()!
    uiEntities.push(first)

    engine.update(1)
    expect(getUi(entityA).rightOf).toBe(entityB)
    expect(getUi(entityB).rightOf).toBe(undefined)

    uiEntities = [...uiEntities]
    engine.update(1)
    expect(getUi(entityA).rightOf).toBe(entityB)
    expect(getUi(entityB).rightOf).toBe(undefined)
    uiEntities = [
      { id: 3, value: 3 },
      { id: 1, value: 1 },
      { id: 2, value: 2 }
    ]
    engine.update(1)
    /**
     * Before => [ 514, 513 ]
     * After InsertBefore => [514, 516, 513]
     *
     * C => 516
     * A => 513
     * B => 514
     */
    const entityC = (rootEntity as number + 1) as Entity
    expect(getUi(entityC).rightOf).toBe(undefined)
    expect(getUi(entityA).rightOf).toBe(entityC)
    expect(getUi(entityB).rightOf).toBe(entityA)

    uiEntities.unshift({ id: 4, value: 4 })
    engine.update(1)
    const entityD = (entityC as number + 1) as Entity
    expect(getUi(entityD).rightOf).toBe(undefined)
    expect(getUi(entityC).rightOf).toBe(entityD)
    expect(getUi(entityA).rightOf).toBe(entityC)
    expect(getUi(entityB).rightOf).toBe(entityA)

    uiEntities = [
      uiEntities[0],
      uiEntities[1],
      { id: 5, value: 5 },
      ...uiEntities.slice(2)
    ]
    engine.update(1)
    const entityE = (entityD as any + 1) as Entity
    expect(getUi(entityD).rightOf).toBe(undefined)
    expect(getUi(entityC).rightOf).toBe(entityD)
    expect(getUi(entityE).rightOf).toBe(entityC)
    expect(getUi(entityA).rightOf).toBe(entityE)
    expect(getUi(entityB).rightOf).toBe(entityA)
    expect(getUi(entityD).width).toBe(4)
    expect(getUi(entityC).width).toBe(3)
    expect(getUi(entityE).width).toBe(5)
    expect(getUi(entityA).width).toBe(1)
    expect(getUi(entityB).width).toBe(2)
  })
})
