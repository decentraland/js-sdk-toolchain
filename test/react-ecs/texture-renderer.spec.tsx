import { Entity } from '../../packages/@dcl/ecs'
import { components } from '../../packages/@dcl/ecs/src'
import { ReactEcs, UiEntity } from '../../packages/@dcl/react-ecs/src'
import { setupEngine } from './utils'

describe('Texture renderer', () => {
  it('parents every entity of the tree to the canvas entity and tears down with it', async () => {
    const { engine, uiRenderer } = setupEngine()
    const Transform = components.Transform(engine)
    const UiTransform = components.UiTransform(engine)
    const canvas = engine.addEntity()
    const ui = () => (
      <UiEntity uiTransform={{ width: 100 }}>
        <UiEntity uiTransform={{ width: 50 }} />
      </UiEntity>
    )

    uiRenderer.setTextureRenderer(canvas, ui)
    await engine.update(1)

    const uiEntities = Array.from(engine.getEntitiesWith(UiTransform)).map(([entity]) => entity)
    expect(uiEntities).toHaveLength(2)
    for (const entity of uiEntities) {
      expect(Transform.get(entity).parent).toBe(canvas)
    }

    engine.removeEntity(canvas)
    // removal is processed at the end of this tick; the UI system cleans up on the next
    await engine.update(1)
    await engine.update(1)
    expect(Array.from(engine.getEntitiesWith(UiTransform))).toHaveLength(0)
  })

  it('replaces the tree when set again and destroys it on remove', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const canvas = engine.addEntity()
    const count = () => Array.from(engine.getEntitiesWith(UiTransform)).length

    uiRenderer.setTextureRenderer(canvas, () => <UiEntity uiTransform={{ width: 100 }} />)
    await engine.update(1)
    expect(count()).toBe(1)

    uiRenderer.setTextureRenderer(canvas, () => (
      <UiEntity uiTransform={{ width: 100 }}>
        <UiEntity uiTransform={{ width: 50 }} />
      </UiEntity>
    ))
    await engine.update(1)
    expect(count()).toBe(2)

    uiRenderer.removeTextureRenderer(canvas)
    await engine.update(1)
    expect(count()).toBe(0)
  })

  it('does not interfere with the main screen UI', async () => {
    const { engine, uiRenderer } = setupEngine()
    const Transform = components.Transform(engine)
    const UiTransform = components.UiTransform(engine)
    const canvas = engine.addEntity()

    uiRenderer.setUiRenderer(() => <UiEntity uiTransform={{ width: 1 }} />, { screenInset: 'none' })
    uiRenderer.setTextureRenderer(canvas, () => <UiEntity uiTransform={{ width: 2 }} />)
    await engine.update(1)

    const parents = Array.from(engine.getEntitiesWith(UiTransform)).map(
      ([entity]) => Transform.getOrNull(entity)?.parent
    )
    expect(parents.sort()).toEqual([canvas, undefined].sort())
  })
})
