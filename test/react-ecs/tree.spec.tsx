import { Entity, MAX_U16 } from '../../packages/@dcl/ecs/src/engine/entity'
import { components } from '../../packages/@dcl/ecs/src'
import { ReactEcs, UiEntity } from '../../packages/@dcl/react-ecs/src'
import { CANVAS_ROOT_ENTITY } from '../../packages/@dcl/react-ecs/src/components/uiTransform'
import { setupEngine } from './utils'

describe('RectEcs UI ✨', () => {
  it('should generate a UI and update the width', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const childEntity = (entityIndex + 1) as Entity
    const entityA = (entityIndex + 2) as Entity
    const entityB = (entityIndex + 3) as Entity
    const rootEntity = (entityIndex + 4) as Entity

    const getUi = (entity: Entity) => UiTransform.get(entity)

    let width = 222

    const ui = () => (
      <UiEntity uiTransform={{ width: 111 }}>
        {/* // Root */}
        <UiEntity uiTransform={{ width: width }}>
          <UiEntity uiTransform={{ width: 222.1 }} />
        </UiEntity>
        {/* UiEntity A */}
        <UiEntity uiTransform={{ width: 333 }} />
        {/* UiEntity B */}
      </UiEntity>
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUi(rootEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
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
    await engine.update(1)

    expect(Array.from(UiTransform.dirtyIterator()).includes(childEntity)).toBe(false)
    expect(Array.from(UiTransform.dirtyIterator()).includes(rootEntity)).toBe(false)
    expect(Array.from(UiTransform.dirtyIterator()).includes(entityB)).toBe(false)
    expect(getUi(entityA).width).toBe(400)
  })
  it('should add a child at the beggining and then remove it', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootEntity = (entityIndex + 3) as Entity
    const entityA = (entityIndex + 1) as Entity
    const entityB = (entityIndex + 2) as Entity
    const entityAdded = (entityIndex + 4) as Entity

    const getUi = (entity: Entity) => UiTransform.get(entity)
    let addChild = false
    const ui = () => {
      return (
        <UiEntity uiTransform={{ width: 111 }}>
          {addChild && <UiEntity uiTransform={{ width: 333 }} />}
          {/* // Root */}
          <UiEntity uiTransform={{ width: 888 }} />
          {/* UiEntity A */}
          <UiEntity uiTransform={{ width: 999 }} />
          {/* UiEntity B */}
        </UiEntity>
      )
    }

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

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

    addChild = true
    await engine.update(1)

    // Root UiEntity doesn't have to change
    expect(Array.from(UiTransform.dirtyIterator()).includes(rootEntity)).toBe(false)

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
    await engine.update(1)

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
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootEntity = (entityIndex + 3) as Entity
    const entityA = (entityIndex + 1) as Entity
    const entityB = (entityIndex + 2) as Entity
    const entityAdded = (entityIndex + 4) as Entity

    const getUi = (entity: Entity) => UiTransform.get(entity)
    let addChild = false
    const ui = () => (
      <UiEntity uiTransform={{ width: 111 }}>
        {/* // Root */}
        <UiEntity uiTransform={{ width: 888 }} />
        {/* UiEntity A */}
        {addChild && <UiEntity uiTransform={{ width: 333 }} />}
        {/* UiEntity Added */}
        <UiEntity uiTransform={{ width: 999 }} />
        {/* UiEntity B */}
      </UiEntity>
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

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
    await engine.update(1)

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
    await engine.update(1)

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
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootEntity = (entityIndex + 3) as Entity
    const entityA = (entityIndex + 1) as Entity
    const entityB = (entityIndex + 2) as Entity
    const entityAdded = (entityIndex + 4) as Entity

    const getUi = (entity: Entity) => UiTransform.get(entity)

    let addChild = false
    const ui = () => (
      <UiEntity uiTransform={{ width: 111 }}>
        {/* // Root */}
        <UiEntity uiTransform={{ width: 888 }} />
        {/* UiEntity A */}
        <UiEntity uiTransform={{ width: 999 }} />
        {/* UiEntity B */}
        {addChild && <UiEntity uiTransform={{ width: 333 }} />}
        {/* UiEntity Added */}
      </UiEntity>
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
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
    await engine.update(1)
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
    await engine.update(1)

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
    const { engine, uiRenderer } = setupEngine()
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
      <UiEntity uiTransform={{ width: 111 }}>
        {/* // Root */}
        <UiEntity uiTransform={{ width: 888 }} />
        {/* UiEntity A */}
        {addChild && (
          <UiEntity uiTransform={{ width: 333 }}>
            <UiEntity uiTransform={{ width: 333.1 }}>
              <UiEntity uiTransform={{ width: 333.11 }} />
            </UiEntity>
            <UiEntity uiTransform={{ width: width }} />
          </UiEntity>
        )}
        {/* UiEntity Added */}
        <UiEntity uiTransform={{ width: 999 }} />
        {/* UiEntity B */}
      </UiEntity>
    )

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    addChild = true
    await engine.update(1)

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
    await engine.update(1)
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
    const { engine, uiRenderer } = setupEngine()
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
      <UiEntity uiTransform={{ width: 111 }}>
        {uiEntities.map((entity) => (
          <UiEntity key={entity.id} uiTransform={{ width: entity.value }} />
        ))}
      </UiEntity>
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

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
    await engine.update(1)

    const entityD = ((rootEntity as number) + 1) as Entity

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
    await engine.update(1)
    expect(getUi(entityA).width).toBe(111)

    // Remove B and C entities
    uiEntities.splice(1, 2)
    await engine.update(1)

    expect(UiTransform.getOrNull(entityB)).toBe(null)
    expect(UiTransform.getOrNull(entityC)).toBe(null)
    expect(getUi(entityD)).toMatchObject({ rightOf: entityA, width: 4 })

    // Add an element at the beginning of the array
    uiEntities.unshift({ id: 8, value: 8 })
    await engine.update(1)
    const newEntity = getUi(entityA).rightOf
    // Entities props doesnt change

    // Now it's more difficult to predic the entityId,
    // but I know that it reuse a removed entity number
    expect(newEntity).toBeGreaterThan(MAX_U16)

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
    const { engine, uiRenderer } = setupEngine()
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
    await engine.update(1)

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

    await engine.update(1)
    expect(getUi(entityA).rightOf).toBe(entityB)
    expect(getUi(entityB).rightOf).toBe(undefined)

    uiEntities = [...uiEntities]
    await engine.update(1)
    expect(getUi(entityA).rightOf).toBe(entityB)
    expect(getUi(entityB).rightOf).toBe(undefined)
    uiEntities = [
      { id: 3, value: 3 },
      { id: 1, value: 1 },
      { id: 2, value: 2 }
    ]
    await engine.update(1)
    /**
     * Before => [ 514, 513 ]
     * After InsertBefore => [514, 516, 513]
     *
     * C => 516
     * A => 513
     * B => 514
     */
    const entityC = ((rootEntity as number) + 1) as Entity
    expect(getUi(entityC).rightOf).toBe(undefined)
    expect(getUi(entityA).rightOf).toBe(entityC)
    expect(getUi(entityB).rightOf).toBe(entityA)

    uiEntities.unshift({ id: 4, value: 4 })
    await engine.update(1)
    const entityD = ((entityC as number) + 1) as Entity
    expect(getUi(entityD).rightOf).toBe(undefined)
    expect(getUi(entityC).rightOf).toBe(entityD)
    expect(getUi(entityA).rightOf).toBe(entityC)
    expect(getUi(entityB).rightOf).toBe(entityA)

    uiEntities = [uiEntities[0], uiEntities[1], { id: 5, value: 5 }, ...uiEntities.slice(2)]
    await engine.update(1)
    const entityE = ((entityD as number) + 1) as Entity
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

  it('should not produce circular rightOf when reordering 3+ keyed siblings via insertBefore', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    let uiEntities: { id: number; value: number }[] = [
      { id: 1, value: 1 },
      { id: 2, value: 2 },
      { id: 3, value: 3 }
    ]

    const entityA = (entityIndex + 1) as Entity
    const entityB = (entityIndex + 2) as Entity
    const entityC = (entityIndex + 3) as Entity
    const rootEntity = (entityIndex + uiEntities.length + 1) as Entity

    const getUi = (entity: any) => UiTransform.get(entity as Entity)

    const ui = () => (
      <UiEntity uiTransform={{ width: 111 }}>
        {uiEntities.map((props) => (
          <UiEntity key={props.id} uiTransform={{ width: props.value }} />
        ))}
      </UiEntity>
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    // Initial order: [A, B, C]
    expect(getUi(entityA)).toMatchObject({ parent: rootEntity, rightOf: undefined, width: 1 })
    expect(getUi(entityB)).toMatchObject({ parent: rootEntity, rightOf: entityA, width: 2 })
    expect(getUi(entityC)).toMatchObject({ parent: rootEntity, rightOf: entityB, width: 3 })

    // Reorder [A, B, C] → [B, A, C]
    // React reconciliation: B stays (oldIdx=1 >= lastPlaced=0), A moves (oldIdx=0 < lastPlaced=1), C stays.
    // React commits A via insertBefore(parent, A, C) since C is the next non-moved sibling.
    // BUG: insertBefore doesn't handle reorders, so B.rightOf=A is never updated,
    // producing A.rightOf=B AND B.rightOf=A (mutual cycle).
    uiEntities = [
      { id: 2, value: 2 },
      { id: 1, value: 1 },
      { id: 3, value: 3 }
    ]
    await engine.update(1)

    // Expected correct order: [B, A, C]
    expect(getUi(entityB)).toMatchObject({ parent: rootEntity, rightOf: undefined, width: 2 })
    expect(getUi(entityA)).toMatchObject({ parent: rootEntity, rightOf: entityB, width: 1 })
    expect(getUi(entityC)).toMatchObject({ parent: rootEntity, rightOf: entityA, width: 3 })

    // Verify no circular rightOf: no entity should reference itself or form a cycle
    const rightOfA = getUi(entityA).rightOf
    const rightOfB = getUi(entityB).rightOf
    const rightOfC = getUi(entityC).rightOf
    expect(rightOfA).not.toBe(entityA) // no self-cycle
    expect(rightOfB).not.toBe(entityB)
    expect(rightOfC).not.toBe(entityC)
    // no mutual cycle: if A.rightOf=X then X.rightOf must not be A
    if (rightOfA) expect(getUi(rightOfA).rightOf).not.toBe(entityA)
    if (rightOfB) expect(getUi(rightOfB).rightOf).not.toBe(entityB)
    if (rightOfC) expect(getUi(rightOfC).rightOf).not.toBe(entityC)
  })

  it('should not produce circular rightOf when reordering 4 keyed siblings with insertBefore and appendChild', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    let uiEntities: { id: number; value: number }[] = [
      { id: 1, value: 1 },
      { id: 2, value: 2 },
      { id: 3, value: 3 },
      { id: 4, value: 4 }
    ]

    const entityA = (entityIndex + 1) as Entity
    const entityB = (entityIndex + 2) as Entity
    const entityC = (entityIndex + 3) as Entity
    const entityD = (entityIndex + 4) as Entity
    const rootEntity = (entityIndex + uiEntities.length + 1) as Entity

    const getUi = (entity: any) => UiTransform.get(entity as Entity)

    const ui = () => (
      <UiEntity uiTransform={{ width: 111 }}>
        {uiEntities.map((props) => (
          <UiEntity key={props.id} uiTransform={{ width: props.value }} />
        ))}
      </UiEntity>
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    // Initial order: [A, B, C, D]
    expect(getUi(entityA)).toMatchObject({ parent: rootEntity, rightOf: undefined, width: 1 })
    expect(getUi(entityB)).toMatchObject({ parent: rootEntity, rightOf: entityA, width: 2 })
    expect(getUi(entityC)).toMatchObject({ parent: rootEntity, rightOf: entityB, width: 3 })
    expect(getUi(entityD)).toMatchObject({ parent: rootEntity, rightOf: entityC, width: 4 })

    // Reorder [A, B, C, D] → [C, A, D, B]
    // React reconciliation:
    //   C: oldIdx=2 >= last=0, no move, last=2
    //   A: oldIdx=0 < last=2, MOVE → insertBefore(parent, A, D)
    //   D: oldIdx=3 >= last=2, no move, last=3
    //   B: oldIdx=1 < last=3, MOVE → appendChild(parent, B)
    // BUG: insertBefore(A, D) corrupts the chain, then appendChild(B) cascades into A↔C cycle.
    uiEntities = [
      { id: 3, value: 3 },
      { id: 1, value: 1 },
      { id: 4, value: 4 },
      { id: 2, value: 2 }
    ]
    await engine.update(1)

    // Expected correct order: [C, A, D, B]
    expect(getUi(entityC)).toMatchObject({ parent: rootEntity, rightOf: undefined, width: 3 })
    expect(getUi(entityA)).toMatchObject({ parent: rootEntity, rightOf: entityC, width: 1 })
    expect(getUi(entityD)).toMatchObject({ parent: rootEntity, rightOf: entityA, width: 4 })
    expect(getUi(entityB)).toMatchObject({ parent: rootEntity, rightOf: entityD, width: 2 })

    // Verify no circular rightOf
    const entities = [entityA, entityB, entityC, entityD]
    for (const entity of entities) {
      const rightOf = getUi(entity).rightOf
      // no self-cycle
      expect(rightOf).not.toBe(entity)
      // no mutual cycle
      if (rightOf) expect(getUi(rightOf).rightOf).not.toBe(entity)
    }
  })
})
