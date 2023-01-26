import {
  Entity,
  YGWrap,
  YGUnit,
  YGFlexDirection,
  YGOverflow,
  YGAlign,
  YGDisplay,
  YGPositionType,
  YGJustify
} from '../../packages/@dcl/ecs'
import { components } from '../../packages/@dcl/ecs/src'
import { Position, PositionUnit, ReactEcs, UiEntity } from '../../packages/@dcl/react-ecs/src'
import { CANVAS_ROOT_ENTITY } from '../../packages/@dcl/react-ecs/src/components/uiTransform'
import { setupEngine } from './utils'

describe('UiTransform React Ecs', () => {
  it('should send empty object if uiTransform is undefined', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const ui = () => <UiEntity uiTransform={undefined} />
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity).width).toBe(0)
  })

  it('should send 0 if you send an invalid px', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const ui = () => (
      <UiEntity
        uiTransform={{
          width: 'boedo' as any, // We are asserting something thats not valid :)
          flexWrap: 'wrap',
          flexDirection: 'column',
          overflow: 'scroll',
          alignItems: 'auto',
          display: 'flex',
          positionType: 'absolute',
          justifyContent: 'flex-end'
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      flexWrap: YGWrap.YGW_WRAP,
      flexDirection: YGFlexDirection.YGFD_COLUMN,
      overflow: YGOverflow.YGO_SCROLL,
      alignItems: YGAlign.YGA_AUTO,
      display: YGDisplay.YGD_FLEX,
      positionType: YGPositionType.YGPT_ABSOLUTE,
      width: 0,
      justifyContent: YGJustify.YGJ_FLEX_END
    })
  })

  it('should send position transform properties', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)

    const position: Position = {
      top: '1px',
      left: '2px',
      right: '3%',
      bottom: 4
    }

    const ui = () => <UiEntity uiTransform={{ width: 100, position }} />

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 100,
      positionTop: 1,
      positionLeft: 2,
      positionRight: 3,
      positionBottom: 4,
      positionTopUnit: YGUnit.YGU_POINT,
      positionLeftUnit: YGUnit.YGU_POINT,
      positionRightUnit: YGUnit.YGU_PERCENT,
      positionBottomUnit: YGUnit.YGU_POINT
    })

    position.left = '88%'
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      positionTop: 1,
      positionLeft: 88,
      positionRight: 3,
      positionBottom: 4,
      positionTopUnit: YGUnit.YGU_POINT,
      positionLeftUnit: YGUnit.YGU_PERCENT,
      positionRightUnit: YGUnit.YGU_PERCENT,
      positionBottomUnit: YGUnit.YGU_POINT
    })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete position.right
    await engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      positionRight: 0,
      positionRightUnit: YGUnit.YGU_UNDEFINED
    })

    position.right = {} as any // Assertion
    position.left = '10%'
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      positionRight: 0,
      positionRightUnit: YGUnit.YGU_UNDEFINED,
      positionLeft: 10,
      positionLeftUnit: YGUnit.YGU_PERCENT
    })
  })

  it('should send height & width properties', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    let width: PositionUnit = '10%'
    const ui = () => (
      <UiEntity
        uiTransform={{
          width,
          height: 10,
          minWidth: '100px',
          minHeight: 100,
          maxHeight: 88,
          maxWidth: '88%'
        }}
      />
    )

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 10,
      widthUnit: YGUnit.YGU_PERCENT,
      height: 10,
      heightUnit: YGUnit.YGU_POINT,
      minHeight: 100,
      minHeightUnit: YGUnit.YGU_POINT,
      minWidth: 100,
      minWidthUnit: YGUnit.YGU_POINT,
      maxWidth: 88,
      maxWidthUnit: YGUnit.YGU_PERCENT,
      maxHeight: 88,
      maxHeightUnit: YGUnit.YGU_POINT
    })

    width = 110
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      width: 110,
      widthUnit: YGUnit.YGU_POINT
    })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    width = undefined
    await engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      width: 0,
      widthUnit: YGUnit.YGU_UNDEFINED
    })

    width = { boedo: 'casla' } as any // Assertion
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      width: 0,
      widthUnit: YGUnit.YGU_UNDEFINED
    })
  })
})
