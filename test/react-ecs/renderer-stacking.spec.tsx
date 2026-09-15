import { Entity } from '../../packages/@dcl/ecs/src/engine'
import { components } from '../../packages/@dcl/ecs/src'
import { UiEntity, ReactEcs } from '../../packages/@dcl/react-ecs/src'
import { CANVAS_ROOT_ENTITY } from '../../packages/@dcl/react-ecs/src/components/uiTransform'
import { resetUiScaleFactor } from '../../packages/@dcl/react-ecs/src/components/utils'
import { setupEngine, WHOLE_SCREEN } from './utils'

/**
 * Stacking order between UI renderers. The renderer paints siblings in rightOf
 * order (and sorts them by zIndex), so what these tests pin down is the
 * `rightOf` chain the SDK writes for the top-level roots and the `zIndex` on
 * each renderer's root entity.
 */
describe('UI renderer stacking', () => {
  afterEach(() => {
    resetUiScaleFactor()
  })

  function rootsOf(engine: ReturnType<typeof setupEngine>['engine']) {
    const UiTransform = components.UiTransform(engine)
    const roots = new Map<number, Entity>()
    for (const [entity, transform] of engine.getEntitiesWith(UiTransform)) {
      if (transform.parent === CANVAS_ROOT_ENTITY) roots.set(transform.width, entity)
    }
    return roots
  }

  /** Root entities of the canvas ordered by their rightOf chain, identified by width. */
  function stackingOrder(engine: ReturnType<typeof setupEngine>['engine']): number[] {
    const UiTransform = components.UiTransform(engine)
    const roots = Array.from(rootsOf(engine).entries())
    const order: number[] = []
    let left: Entity = 0 as Entity
    while (order.length < roots.length) {
      const next = roots.find(([, entity]) => UiTransform.get(entity).rightOf === left)
      if (!next) throw new Error(`broken rightOf chain after entity ${left}`)
      order.push(next[0])
      left = next[1]
    }
    return order
  }

  it('chains the roots of additional renderers in registration order', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)

    uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 100 }} />, WHOLE_SCREEN)
    uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 200 }} />, WHOLE_SCREEN)
    await engine.update(1)

    const roots = rootsOf(engine)
    expect(UiTransform.get(roots.get(100)!)).toMatchObject({ parent: CANVAS_ROOT_ENTITY, rightOf: 0 })
    expect(UiTransform.get(roots.get(200)!)).toMatchObject({ parent: CANVAS_ROOT_ENTITY, rightOf: roots.get(100) })
  })

  it('stacks the main renderer first among renderers first rendered in the same tick', async () => {
    const { engine, uiRenderer } = setupEngine()

    // Registered after an additional renderer, but rendered in the same tick: the
    // main UI still goes at the back, as its entities were always created first.
    uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 100 }} />, WHOLE_SCREEN)
    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 200 }} />, WHOLE_SCREEN)
    uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 300 }} />, WHOLE_SCREEN)
    await engine.update(1)

    expect(stackingOrder(engine)).toEqual([200, 100, 300])
  })

  it('stacks the main renderer on top when it first renders in a later tick', async () => {
    const { engine, uiRenderer } = setupEngine()

    uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 100 }} />, WHOLE_SCREEN)
    await engine.update(1)
    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 200 }} />, WHOLE_SCREEN)
    await engine.update(1)

    expect(stackingOrder(engine)).toEqual([100, 200])
  })

  it('stacks the main renderer first when it was registered first', async () => {
    const { engine, uiRenderer } = setupEngine()

    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 100 }} />, WHOLE_SCREEN)
    uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 200 }} />, WHOLE_SCREEN)
    await engine.update(1)

    expect(stackingOrder(engine)).toEqual([100, 200])
  })

  it('keeps the place of a replaced renderer', async () => {
    const { engine, uiRenderer } = setupEngine()
    const replaced = engine.addEntity()

    uiRenderer.addUiRenderer(replaced, () => <UiEntity uiTransform={{ width: 100 }} />, WHOLE_SCREEN)
    await engine.update(1)
    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 200 }} />, WHOLE_SCREEN)
    uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 300 }} />, WHOLE_SCREEN)
    await engine.update(1)
    expect(stackingOrder(engine)).toEqual([100, 200, 300])

    // Replacing both the first additional renderer and the main one leaves the order alone.
    uiRenderer.addUiRenderer(replaced, () => <UiEntity uiTransform={{ width: 101 }} />, WHOLE_SCREEN)
    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 201 }} />, WHOLE_SCREEN)
    await engine.update(1)
    expect(stackingOrder(engine)).toEqual([101, 201, 300])
  })

  it('repairs the chain when a renderer in the middle is removed, and re-adding puts it on top', async () => {
    const { engine, uiRenderer } = setupEngine()
    const middle = engine.addEntity()

    uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 100 }} />, WHOLE_SCREEN)
    uiRenderer.addUiRenderer(middle, () => <UiEntity uiTransform={{ width: 200 }} />, WHOLE_SCREEN)
    uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 300 }} />, WHOLE_SCREEN)
    await engine.update(1)
    expect(stackingOrder(engine)).toEqual([100, 200, 300])

    uiRenderer.removeUiRenderer(middle)
    await engine.update(1)
    expect(stackingOrder(engine)).toEqual([100, 300])

    uiRenderer.addUiRenderer(middle, () => <UiEntity uiTransform={{ width: 200 }} />, WHOLE_SCREEN)
    await engine.update(1)
    expect(stackingOrder(engine)).toEqual([100, 300, 200])
  })

  it('repairs the chain when the owner entity of a renderer is removed', async () => {
    const { engine, uiRenderer } = setupEngine()
    const owner = engine.addEntity()

    uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 100 }} />, WHOLE_SCREEN)
    uiRenderer.addUiRenderer(owner, () => <UiEntity uiTransform={{ width: 200 }} />, WHOLE_SCREEN)
    uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 300 }} />, WHOLE_SCREEN)
    await engine.update(1)

    engine.removeEntity(owner)
    // The removal is processed at the end of the first cycle; the UI system sees it on the next.
    await engine.update(1)
    await engine.update(1)
    expect(stackingOrder(engine)).toEqual([100, 300])
  })

  it('keeps top-level siblings of a single renderer chained when one is inserted first', async () => {
    const { engine, uiRenderer } = setupEngine()
    let showFirst = false

    // With no inset wrapper, the component's top-level elements are the canvas root's children.
    uiRenderer.setUiRenderer(
      () => [
        showFirst ? <UiEntity key="a" uiTransform={{ width: 100 }} /> : null,
        <UiEntity key="b" uiTransform={{ width: 200 }} />
      ],
      WHOLE_SCREEN
    )
    await engine.update(1)
    expect(stackingOrder(engine)).toEqual([200])

    showFirst = true
    await engine.update(1)
    expect(stackingOrder(engine)).toEqual([100, 200])
  })

  describe('zIndex option', () => {
    it('writes the zIndex on the device inset wrapper', async () => {
      const { engine, uiRenderer } = setupEngine()
      const UiTransform = components.UiTransform(engine)

      uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 100 }} />, {
        screenInset: 'device',
        zIndex: 300
      })
      await engine.update(1)

      const [wrapper] = rootsOf(engine).values()
      expect(UiTransform.get(wrapper)).toMatchObject({ positionType: 1, zIndex: 300 })
      expect(Array.from(engine.getEntitiesWith(UiTransform))).toHaveLength(2)
    })

    it('writes the zIndex on the interactable inset wrapper', async () => {
      const { engine, uiRenderer } = setupEngine()
      const UiTransform = components.UiTransform(engine)

      uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 100 }} />, {
        screenInset: 'interactable',
        zIndex: -5
      })
      await engine.update(1)

      const [wrapper] = rootsOf(engine).values()
      expect(UiTransform.get(wrapper)).toMatchObject({ positionType: 1, zIndex: -5 })
    })

    it('adds a whole-screen root carrying the zIndex when there is no inset', async () => {
      const { engine, uiRenderer } = setupEngine()
      const UiTransform = components.UiTransform(engine)

      uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 100 }} />, {
        screenInset: 'none',
        zIndex: 50
      })
      await engine.update(1)

      const entities = Array.from(engine.getEntitiesWith(UiTransform))
      expect(entities).toHaveLength(2)
      const [wrapper] = rootsOf(engine).values()
      expect(UiTransform.get(wrapper)).toMatchObject({
        parent: CANVAS_ROOT_ENTITY,
        positionType: 1,
        positionTop: 0,
        positionLeft: 0,
        positionRight: 0,
        positionBottom: 0,
        zIndex: 50
      })
      const inner = entities.find(([entity]) => entity !== wrapper)!
      expect(inner[1]).toMatchObject({ parent: wrapper, width: 100 })
    })

    it('adds no wrapper without an inset when no zIndex is given', async () => {
      const { engine, uiRenderer } = setupEngine()
      const UiTransform = components.UiTransform(engine)

      uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 100 }} />, WHOLE_SCREEN)
      await engine.update(1)

      const entities = Array.from(engine.getEntitiesWith(UiTransform))
      expect(entities).toHaveLength(1)
      expect(entities[0][1]).toMatchObject({ parent: CANVAS_ROOT_ENTITY, width: 100, zIndex: 0 })
    })

    it('leaves the wrapper zIndex at its default when the option is omitted', async () => {
      const { engine, uiRenderer } = setupEngine()
      const UiTransform = components.UiTransform(engine)

      uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 100 }} />)
      await engine.update(1)

      const [wrapper] = rootsOf(engine).values()
      expect(UiTransform.get(wrapper).zIndex).toBe(0)
    })

    it('orders renderers by zIndex independently of registration order', async () => {
      const { engine, uiRenderer } = setupEngine()
      const UiTransform = components.UiTransform(engine)

      // The issue's scenario: registered later, but meant to sit behind.
      uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 100 }} />, { zIndex: 300 })
      uiRenderer.addUiRenderer(engine.addEntity(), () => <UiEntity uiTransform={{ width: 200 }} />, { zIndex: 50 })
      await engine.update(1)

      const wrappers = Array.from(engine.getEntitiesWith(UiTransform))
        .filter(([, t]) => t.parent === CANVAS_ROOT_ENTITY)
        .map(([, t]) => t)
      expect(wrappers.map((t) => t.zIndex).sort((a, b) => a! - b!)).toEqual([50, 300])
      // Both are still chained, so the renderer has a defined fallback order too.
      expect(wrappers.filter((t) => t.rightOf === 0)).toHaveLength(1)
    })
  })
})
