import { Entity } from '../../packages/@dcl/ecs'
import { components } from '../../packages/@dcl/ecs/src'
import { ReactEcs, UiEntity, Label } from '../../packages/@dcl/react-ecs/src'
import { CANVAS_ROOT_ENTITY } from '../../packages/@dcl/react-ecs/src/components/uiTransform'
import { setupEngine } from './utils'

describe('Fragment support', () => {
  it('should render multiple children via <> shorthand without a wrapper entity', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiText = components.UiText(engine)
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    const entityA = (entityIndex + 1) as Entity
    const entityB = (entityIndex + 2) as Entity

    const ui = () => (
      <>
        <Label uiTransform={{ width: 100 }} value="first" />
        <Label uiTransform={{ width: 200 }} value="second" />
      </>
    )

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    expect(UiText.get(entityA).value).toBe('first')
    expect(UiText.get(entityB).value).toBe('second')
    expect(UiTransform.get(entityA)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      width: 100
    })
    expect(UiTransform.get(entityB)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      width: 200
    })
  })

  it('should handle nested fragments without creating extra entities', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiText = components.UiText(engine)
    const entityIndex = engine.addEntity() as number

    const entityA = (entityIndex + 1) as Entity
    const entityB = (entityIndex + 2) as Entity
    const entityC = (entityIndex + 3) as Entity

    const ui = () => (
      <>
        <Label uiTransform={{ width: 100 }} value="a" />
        <>
          <Label uiTransform={{ width: 200 }} value="b" />
          <Label uiTransform={{ width: 300 }} value="c" />
        </>
      </>
    )

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    expect(UiText.get(entityA).value).toBe('a')
    expect(UiText.get(entityB).value).toBe('b')
    expect(UiText.get(entityC).value).toBe('c')
  })

  it('should render fragment children inside a UiEntity parent with correct parent-child relationships', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const UiText = components.UiText(engine)
    const entityIndex = engine.addEntity() as number

    const entityA = (entityIndex + 1) as Entity
    const entityB = (entityIndex + 2) as Entity
    const parentEntity = (entityIndex + 3) as Entity

    const ui = () => (
      <UiEntity uiTransform={{ width: 500 }}>
        <>
          <Label uiTransform={{ width: 100 }} value="child1" />
          <Label uiTransform={{ width: 200 }} value="child2" />
        </>
      </UiEntity>
    )

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    expect(UiTransform.get(parentEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 500
    })
    expect(UiText.get(entityA).value).toBe('child1')
    expect(UiTransform.get(entityA)).toMatchObject({
      parent: parentEntity,
      width: 100
    })
    expect(UiText.get(entityB).value).toBe('child2')
    expect(UiTransform.get(entityB)).toMatchObject({
      parent: parentEntity,
      rightOf: entityA,
      width: 200
    })
  })
})
