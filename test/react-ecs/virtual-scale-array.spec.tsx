import { Entity } from '../../packages/@dcl/ecs/src/engine'
import { YGUnit } from '../../packages/@dcl/ecs'
import { components } from '../../packages/@dcl/ecs/src'
import { ReactEcs, UiEntity } from '../../packages/@dcl/react-ecs/src'
import {
  getUiScaleFactor,
  resetUiScaleFactor
} from '../../packages/@dcl/react-ecs/src/components/utils'
import { setupEngine } from './utils'

function Panel1() {
  return <UiEntity uiTransform={{ width: 300, height: 300 }} />
}

function Panel2() {
  return <UiEntity uiTransform={{ width: 600, height: 400 }} />
}

// Parent uses % — children use pixels
function PercentParentWithPixelChildren() {
  return (
    <UiEntity uiTransform={{ width: '100%', height: '50%' }}>
      <UiEntity uiTransform={{ width: 200, height: 100 }} />
      <UiEntity uiTransform={{ width: '150px', height: '80px' }} />
    </UiEntity>
  )
}

// Parent uses pixels — children use %
function PixelParentWithPercentChildren() {
  return (
    <UiEntity uiTransform={{ width: 400, height: 300 }}>
      <UiEntity uiTransform={{ width: '50%', height: '25%' }} />
      <UiEntity uiTransform={{ width: 100, height: 50 }} />
    </UiEntity>
  )
}

// Deep nesting with mixed units
function DeeplyNestedMixed() {
  return (
    <UiEntity uiTransform={{ width: '100%', height: '100%' }}>
      <UiEntity uiTransform={{ width: 500, height: 250, padding: 10 }}>
        <UiEntity uiTransform={{ width: '50%', height: '50%' }}>
          <UiEntity uiTransform={{ width: 100, height: 60, margin: '20px' }} />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}

function createCanvasInfo(engine: any) {
  const UiCanvasInformation = components.UiCanvasInformation(engine)
  UiCanvasInformation.create(engine.RootEntity, {
    devicePixelRatio: 1,
    width: 3840,
    height: 2160,
    interactableArea: { left: 0, right: 0, top: 0, bottom: 0 }
  })
  return UiCanvasInformation
}

describe('Virtual scale factor with array UI renderers', () => {
  afterEach(() => {
    resetUiScaleFactor()
  })

  it('should apply scale factor when returning a single element', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    createCanvasInfo(engine)
    const entityIndex = engine.addEntity() as number

    uiRenderer.setUiRenderer(
      () => <Panel1 />,
      { virtualWidth: 1920, virtualHeight: 1080 }
    )

    await engine.update(1)

    // scale = Math.min(3840/1920, 2160/1080) = 2
    expect(getUiScaleFactor()).toBe(2)

    const panelEntity = (entityIndex + 1) as Entity
    expect(UiTransform.get(panelEntity).width).toBe(600)  // 300 * 2
    expect(UiTransform.get(panelEntity).height).toBe(600)  // 300 * 2

    uiRenderer.destroy()
  })

  it('should apply scale factor when returning an array of direct function calls', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    createCanvasInfo(engine)
    const entityIndex = engine.addEntity() as number

    uiRenderer.setUiRenderer(
      () => [Panel1(), Panel2()],
      { virtualWidth: 1920, virtualHeight: 1080 }
    )

    await engine.update(1)

    expect(getUiScaleFactor()).toBe(2)

    const panel1Entity = (entityIndex + 1) as Entity
    const panel2Entity = (entityIndex + 2) as Entity
    expect(UiTransform.get(panel1Entity).width).toBe(600)   // 300 * 2
    expect(UiTransform.get(panel1Entity).height).toBe(600)   // 300 * 2
    expect(UiTransform.get(panel2Entity).width).toBe(1200)   // 600 * 2
    expect(UiTransform.get(panel2Entity).height).toBe(800)   // 400 * 2

    uiRenderer.destroy()
  })

  it('should apply scale factor when returning an array of JSX components', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    createCanvasInfo(engine)
    const entityIndex = engine.addEntity() as number

    uiRenderer.setUiRenderer(
      () => [<Panel1 key="p1" />, <Panel2 key="p2" />],
      { virtualWidth: 1920, virtualHeight: 1080 }
    )

    await engine.update(1)

    expect(getUiScaleFactor()).toBe(2)

    const panel1Entity = (entityIndex + 1) as Entity
    const panel2Entity = (entityIndex + 2) as Entity
    expect(UiTransform.get(panel1Entity).width).toBe(600)
    expect(UiTransform.get(panel1Entity).height).toBe(600)
    expect(UiTransform.get(panel2Entity).width).toBe(1200)
    expect(UiTransform.get(panel2Entity).height).toBe(800)

    uiRenderer.destroy()
  })
})

describe('Virtual scale factor with mixed % and pixel values', () => {
  afterEach(() => {
    resetUiScaleFactor()
  })

  it('should scale pixel children inside a %-sized parent', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    createCanvasInfo(engine)
    const entityIndex = engine.addEntity() as number

    // scale = Math.min(3840/1920, 2160/1080) = 2
    uiRenderer.setUiRenderer(
      () => <PercentParentWithPixelChildren />,
      { virtualWidth: 1920, virtualHeight: 1080 }
    )

    await engine.update(1)
    expect(getUiScaleFactor()).toBe(2)

    // React reconciler creates entities bottom-up (children before parents)
    // Child 1: 200px, 100px — pixels should be scaled by 2
    const child1Entity = (entityIndex + 1) as Entity
    expect(UiTransform.get(child1Entity).width).toBe(400)   // 200 * 2
    expect(UiTransform.get(child1Entity).widthUnit).toBe(YGUnit.YGU_POINT)
    expect(UiTransform.get(child1Entity).height).toBe(200)   // 100 * 2
    expect(UiTransform.get(child1Entity).heightUnit).toBe(YGUnit.YGU_POINT)

    // Child 2: '150px', '80px' — px strings should also be scaled by 2
    const child2Entity = (entityIndex + 2) as Entity
    expect(UiTransform.get(child2Entity).width).toBe(300)   // 150 * 2
    expect(UiTransform.get(child2Entity).widthUnit).toBe(YGUnit.YGU_POINT)
    expect(UiTransform.get(child2Entity).height).toBe(160)   // 80 * 2
    expect(UiTransform.get(child2Entity).heightUnit).toBe(YGUnit.YGU_POINT)

    // Parent: 100%, 50% — percentages should NOT be scaled
    const parentEntity = (entityIndex + 3) as Entity
    expect(UiTransform.get(parentEntity).width).toBe(100)
    expect(UiTransform.get(parentEntity).widthUnit).toBe(YGUnit.YGU_PERCENT)
    expect(UiTransform.get(parentEntity).height).toBe(50)
    expect(UiTransform.get(parentEntity).heightUnit).toBe(YGUnit.YGU_PERCENT)

    uiRenderer.destroy()
  })

  it('should scale pixel parent but not %-sized children', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    createCanvasInfo(engine)
    const entityIndex = engine.addEntity() as number

    uiRenderer.setUiRenderer(
      () => <PixelParentWithPercentChildren />,
      { virtualWidth: 1920, virtualHeight: 1080 }
    )

    await engine.update(1)
    expect(getUiScaleFactor()).toBe(2)

    // React reconciler creates entities bottom-up (children before parents)
    // Child 1: 50%, 25% — NOT scaled
    const child1Entity = (entityIndex + 1) as Entity
    expect(UiTransform.get(child1Entity).width).toBe(50)
    expect(UiTransform.get(child1Entity).widthUnit).toBe(YGUnit.YGU_PERCENT)
    expect(UiTransform.get(child1Entity).height).toBe(25)
    expect(UiTransform.get(child1Entity).heightUnit).toBe(YGUnit.YGU_PERCENT)

    // Child 2: 100px, 50px — scaled by 2
    const child2Entity = (entityIndex + 2) as Entity
    expect(UiTransform.get(child2Entity).width).toBe(200)   // 100 * 2
    expect(UiTransform.get(child2Entity).widthUnit).toBe(YGUnit.YGU_POINT)
    expect(UiTransform.get(child2Entity).height).toBe(100)   // 50 * 2
    expect(UiTransform.get(child2Entity).heightUnit).toBe(YGUnit.YGU_POINT)

    // Parent: 400px, 300px — scaled by 2
    const parentEntity = (entityIndex + 3) as Entity
    expect(UiTransform.get(parentEntity).width).toBe(800)   // 400 * 2
    expect(UiTransform.get(parentEntity).widthUnit).toBe(YGUnit.YGU_POINT)
    expect(UiTransform.get(parentEntity).height).toBe(600)   // 300 * 2
    expect(UiTransform.get(parentEntity).heightUnit).toBe(YGUnit.YGU_POINT)

    uiRenderer.destroy()
  })

  it('should handle deeply nested mixed % and pixel values', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    createCanvasInfo(engine)
    const entityIndex = engine.addEntity() as number

    uiRenderer.setUiRenderer(
      () => <DeeplyNestedMixed />,
      { virtualWidth: 1920, virtualHeight: 1080 }
    )

    await engine.update(1)
    expect(getUiScaleFactor()).toBe(2)

    // React reconciler creates entities bottom-up (deepest children first)
    // Level 3 (deepest): 100px, 60px, margin '20px' — all scaled by 2
    const level3 = (entityIndex + 1) as Entity
    expect(UiTransform.get(level3).width).toBe(200)    // 100 * 2
    expect(UiTransform.get(level3).height).toBe(120)    // 60 * 2
    expect(UiTransform.get(level3).marginTop).toBe(40)   // 20 * 2
    expect(UiTransform.get(level3).marginBottom).toBe(40)
    expect(UiTransform.get(level3).marginLeft).toBe(40)
    expect(UiTransform.get(level3).marginRight).toBe(40)

    // Level 2: 50%, 50% — NOT scaled
    const level2 = (entityIndex + 2) as Entity
    expect(UiTransform.get(level2).width).toBe(50)
    expect(UiTransform.get(level2).widthUnit).toBe(YGUnit.YGU_PERCENT)
    expect(UiTransform.get(level2).height).toBe(50)
    expect(UiTransform.get(level2).heightUnit).toBe(YGUnit.YGU_PERCENT)

    // Level 1: 500px, 250px, padding 10px — all scaled by 2
    const level1 = (entityIndex + 3) as Entity
    expect(UiTransform.get(level1).width).toBe(1000)   // 500 * 2
    expect(UiTransform.get(level1).height).toBe(500)    // 250 * 2
    expect(UiTransform.get(level1).paddingTop).toBe(20)  // 10 * 2
    expect(UiTransform.get(level1).paddingBottom).toBe(20)
    expect(UiTransform.get(level1).paddingLeft).toBe(20)
    expect(UiTransform.get(level1).paddingRight).toBe(20)

    // Level 0 (root): 100%, 100% — NOT scaled
    const level0 = (entityIndex + 4) as Entity
    expect(UiTransform.get(level0).width).toBe(100)
    expect(UiTransform.get(level0).widthUnit).toBe(YGUnit.YGU_PERCENT)
    expect(UiTransform.get(level0).height).toBe(100)
    expect(UiTransform.get(level0).heightUnit).toBe(YGUnit.YGU_PERCENT)

    uiRenderer.destroy()
  })

  it('should scale pixel children inside %-sized parent returned as array', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    createCanvasInfo(engine)
    const entityIndex = engine.addEntity() as number

    // Combine the two scenarios: array of elements + mixed %/pixel values
    uiRenderer.setUiRenderer(
      () => [PercentParentWithPixelChildren(), PixelParentWithPercentChildren()],
      { virtualWidth: 1920, virtualHeight: 1080 }
    )

    await engine.update(1)
    expect(getUiScaleFactor()).toBe(2)

    // React reconciler creates entities bottom-up per tree, trees processed left to right

    // --- First tree: PercentParentWithPixelChildren ---
    // Child 1: 200, 100 → scaled by 2
    const tree1Child1 = (entityIndex + 1) as Entity
    expect(UiTransform.get(tree1Child1).width).toBe(400)
    expect(UiTransform.get(tree1Child1).height).toBe(200)

    // Child 2: '150px', '80px' → scaled by 2
    const tree1Child2 = (entityIndex + 2) as Entity
    expect(UiTransform.get(tree1Child2).width).toBe(300)
    expect(UiTransform.get(tree1Child2).height).toBe(160)

    // Parent: 100%, 50%
    const tree1Parent = (entityIndex + 3) as Entity
    expect(UiTransform.get(tree1Parent).width).toBe(100)
    expect(UiTransform.get(tree1Parent).widthUnit).toBe(YGUnit.YGU_PERCENT)
    expect(UiTransform.get(tree1Parent).height).toBe(50)
    expect(UiTransform.get(tree1Parent).heightUnit).toBe(YGUnit.YGU_PERCENT)

    // --- Second tree: PixelParentWithPercentChildren ---
    // Child 1: 50%, 25% → NOT scaled
    const tree2Child1 = (entityIndex + 4) as Entity
    expect(UiTransform.get(tree2Child1).width).toBe(50)
    expect(UiTransform.get(tree2Child1).widthUnit).toBe(YGUnit.YGU_PERCENT)
    expect(UiTransform.get(tree2Child1).height).toBe(25)
    expect(UiTransform.get(tree2Child1).heightUnit).toBe(YGUnit.YGU_PERCENT)

    // Child 2: 100, 50 → scaled by 2
    const tree2Child2 = (entityIndex + 5) as Entity
    expect(UiTransform.get(tree2Child2).width).toBe(200)
    expect(UiTransform.get(tree2Child2).height).toBe(100)

    // Parent: 400, 300 → scaled by 2
    const tree2Parent = (entityIndex + 6) as Entity
    expect(UiTransform.get(tree2Parent).width).toBe(800)
    expect(UiTransform.get(tree2Parent).height).toBe(600)

    uiRenderer.destroy()
  })

  it('should use scale factor 1 when UiCanvasInformation is not yet available', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Do NOT create UiCanvasInformation — simulates the first tick before the renderer provides it
    uiRenderer.setUiRenderer(
      () => <UiEntity uiTransform={{ width: 300, height: 200 }} />,
      { virtualWidth: 1920, virtualHeight: 1080 }
    )

    await engine.update(1)

    // Scale factor should remain at the default of 1
    expect(getUiScaleFactor()).toBe(1)

    // Pixel values should pass through unscaled
    const entity = (entityIndex + 1) as Entity
    expect(UiTransform.get(entity).width).toBe(300)
    expect(UiTransform.get(entity).height).toBe(200)

    uiRenderer.destroy()
  })
})
