import {
  Entity,
  YGWrap,
  YGUnit,
  YGFlexDirection,
  YGOverflow,
  YGAlign,
  YGDisplay,
  YGPositionType,
  YGJustify,
  PointerFilterMode,
  PBUiTransform
} from '../../packages/@dcl/ecs'
import { components } from '../../packages/@dcl/ecs/src'
import {
  BorderRadius,
  Position,
  PositionUnit,
  ReactEcs,
  UiEntity,
  UiTransformProps
} from '../../packages/@dcl/react-ecs/src'
import { CANVAS_ROOT_ENTITY } from '../../packages/@dcl/react-ecs/src/components/uiTransform'
import { Color4 } from '../../packages/@dcl/sdk/math'
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
    const UiText = components.UiText(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const ui = () => (
      <UiEntity
        uiText={{ value: 'BOEDO' }}
        uiTransform={{
          width: 'boedo' as any, // We are asserting something thats not valid :)
          flexWrap: 'wrap',
          flexDirection: 'column',
          overflow: 'scroll',
          alignItems: 'auto',
          display: 'flex',
          positionType: 'absolute',
          justifyContent: 'flex-end',
          alignContent: 'auto'
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(UiText.get(rootDivEntity)).toMatchObject({ value: 'BOEDO' })
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      flexWrap: YGWrap.YGW_WRAP,
      flexDirection: YGFlexDirection.YGFD_COLUMN,
      overflow: YGOverflow.YGO_SCROLL,
      alignItems: YGAlign.YGA_AUTO,
      display: YGDisplay.YGD_FLEX,
      positionType: YGPositionType.YGPT_ABSOLUTE,
      width: 0,
      justifyContent: YGJustify.YGJ_FLEX_END,
      alignContent: YGAlign.YGA_AUTO
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

  it('should send border properties', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)

    let borderRadius: BorderRadius | number = {
      topLeft: '1px',
      bottomLeft: '2px',
      bottomRight: '3%',
      topRight: 4
    }

    let borderWidth: Position | number = {
      top: '1px',
      left: '2px',
      right: '3%',
      bottom: 4
    }

    const ui = () => <UiEntity uiTransform={{ width: 100, borderRadius, borderColor: Color4.Green(), borderWidth }} />

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    const matchObject: Partial<PBUiTransform> = {
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 100,
      // border width
      borderTopWidth: 1,
      borderLeftWidth: 2,
      borderRightWidth: 3,
      borderBottomWidth: 4,
      borderTopWidthUnit: YGUnit.YGU_POINT,
      borderLeftWidthUnit: YGUnit.YGU_POINT,
      borderRightWidthUnit: YGUnit.YGU_PERCENT,
      borderBottomWidthUnit: YGUnit.YGU_POINT,
      // border radius
      borderTopLeftRadius: 1,
      borderBottomLeftRadius: 2,
      borderBottomRightRadius: 3,
      borderTopRightRadius: 4,
      borderTopLeftRadiusUnit: YGUnit.YGU_POINT,
      borderBottomLeftRadiusUnit: YGUnit.YGU_POINT,
      borderBottomRightRadiusUnit: YGUnit.YGU_PERCENT,
      borderTopRightRadiusUnit: YGUnit.YGU_POINT,

      // border color
      borderTopColor: Color4.Green(),
      borderRightColor: Color4.Green(),
      borderLeftColor: Color4.Green(),
      borderBottomColor: Color4.Green()
    }
    expect(getUiTransform(rootDivEntity)).toMatchObject(matchObject)

    borderRadius.topLeft = '88%'
    borderWidth.top = '10%'
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      borderTopWidth: 10,
      borderTopWidthUnit: YGUnit.YGU_PERCENT,
      borderTopLeftRadius: 88,
      borderTopLeftRadiusUnit: YGUnit.YGU_PERCENT
    })

    borderRadius.topLeft = '10%'
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      borderTopLeftRadius: 10,
      borderTopLeftRadiusUnit: YGUnit.YGU_PERCENT
    })

    borderWidth = 88
    borderRadius = 888
    await engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      borderTopWidth: 88,
      borderLeftWidth: 88,
      borderRightWidth: 88,
      borderBottomWidth: 88,
      borderTopWidthUnit: YGUnit.YGU_POINT,
      borderLeftWidthUnit: YGUnit.YGU_POINT,
      borderRightWidthUnit: YGUnit.YGU_POINT,
      borderBottomWidthUnit: YGUnit.YGU_POINT,

      borderTopLeftRadius: 888,
      borderBottomLeftRadius: 888,
      borderBottomRightRadius: 888,
      borderTopRightRadius: 888,
      borderTopLeftRadiusUnit: YGUnit.YGU_POINT,
      borderBottomLeftRadiusUnit: YGUnit.YGU_POINT,
      borderBottomRightRadiusUnit: YGUnit.YGU_POINT,
      borderTopRightRadiusUnit: YGUnit.YGU_POINT
    })

    borderRadius = { topLeft: undefined } as any
    borderWidth = { top: undefined } as any

    await engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      borderTopWidth: undefined,
      borderLeftWidth: undefined,
      borderRightWidth: undefined,
      borderBottomWidth: undefined,
      borderTopWidthUnit: undefined,
      borderLeftWidthUnit: undefined,
      borderRightWidthUnit: undefined,
      borderBottomWidthUnit: undefined,

      borderTopLeftRadius: undefined,
      borderBottomLeftRadius: undefined,
      borderBottomRightRadius: undefined,
      borderTopRightRadius: undefined,
      borderTopLeftRadiusUnit: undefined,
      borderBottomLeftRadiusUnit: undefined,
      borderBottomRightRadiusUnit: undefined,
      borderTopRightRadiusUnit: undefined
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
      widthUnit: YGUnit.YGU_AUTO
    })

    width = { boedo: 'casla' } as any // Assertion
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      width: 0,
      widthUnit: YGUnit.YGU_AUTO
    })
  })

  it('should parse margin shorthand props', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)

    let margin: UiTransformProps['margin'] = '1px'

    const ui = () => <UiEntity uiTransform={{ margin }} />

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      marginTop: 1,
      marginLeft: 1,
      marginRight: 1,
      marginBottom: 1,
      marginTopUnit: YGUnit.YGU_POINT,
      marginLeftUnit: YGUnit.YGU_POINT,
      marginRightUnit: YGUnit.YGU_POINT,
      marginBottomUnit: YGUnit.YGU_POINT
    })
    margin = '1px 10%'
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      marginTop: 1,
      marginLeft: 10,
      marginRight: 10,
      marginBottom: 1,
      marginTopUnit: YGUnit.YGU_POINT,
      marginLeftUnit: YGUnit.YGU_PERCENT,
      marginRightUnit: YGUnit.YGU_PERCENT,
      marginBottomUnit: YGUnit.YGU_POINT
    })
    margin = '1px 100 4%'
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      marginTop: 1,
      marginLeft: 100,
      marginRight: 100,
      marginBottom: 4,
      marginTopUnit: YGUnit.YGU_POINT,
      marginLeftUnit: YGUnit.YGU_POINT,
      marginRightUnit: YGUnit.YGU_POINT,
      marginBottomUnit: YGUnit.YGU_PERCENT
    })
    margin = '1% 100% 4 3px'
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      marginTop: 1,
      marginLeft: 3,
      marginRight: 100,
      marginBottom: 4,
      marginTopUnit: YGUnit.YGU_PERCENT,
      marginLeftUnit: YGUnit.YGU_POINT,
      marginRightUnit: YGUnit.YGU_PERCENT,
      marginBottomUnit: YGUnit.YGU_POINT
    })

    margin = '1% 100% 4vw 3px'
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      marginTop: 1,
      marginLeft: 3,
      marginRight: 100,
      marginBottom: 4,
      marginTopUnit: YGUnit.YGU_PERCENT,
      marginLeftUnit: YGUnit.YGU_POINT,
      marginRightUnit: YGUnit.YGU_PERCENT,
      marginBottomUnit: YGUnit.YGU_POINT
    })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    margin = {}
    await engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      marginRight: 0,
      marginRightUnit: YGUnit.YGU_UNDEFINED
    })
    margin = 8
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      marginTop: 8,
      marginLeft: 8,
      marginRight: 8,
      marginBottom: 8,
      marginTopUnit: YGUnit.YGU_POINT,
      marginLeftUnit: YGUnit.YGU_POINT,
      marginRightUnit: YGUnit.YGU_POINT,
      marginBottomUnit: YGUnit.YGU_POINT
    })
  })

  it('should parse pointerFilter correctly', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const ui = () => (
      <UiEntity
        uiTransform={{
          pointerFilter: 'block'
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      pointerFilter: PointerFilterMode.PFM_BLOCK
    })
  })

  it('should parse auto size correctly', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const ui = () => (
      <UiEntity
        uiTransform={{
          width: 'auto',
          height: 'auto'
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      widthUnit: YGUnit.YGU_AUTO,
      heightUnit: YGUnit.YGU_AUTO
    })
  })

  it('should parse zIndex correctly', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)

    // Test with positive zIndex
    let ui = () => (
      <UiEntity
        uiTransform={{
          zIndex: 10
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      zIndex: 10
    })

    // Test with negative zIndex
    ui = () => (
      <UiEntity
        uiTransform={{
          zIndex: -5
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      zIndex: -5
    })

    // Test with zero zIndex
    ui = () => (
      <UiEntity
        uiTransform={{
          zIndex: 0
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      zIndex: 0
    })

    // Test without zIndex (should use default)
    ui = () => (
      <UiEntity
        uiTransform={{
          width: 100
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      zIndex: undefined
    })
  })

  it('should parse opacity correctly', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)

    // Test with opacity value
    let ui = () => (
      <UiEntity
        uiTransform={{
          opacity: 0.5
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      opacity: 0.5
    })

    // Test with full opacity
    ui = () => (
      <UiEntity
        uiTransform={{
          opacity: 1.0
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      opacity: 1.0
    })

    // Test with zero opacity
    ui = () => (
      <UiEntity
        uiTransform={{
          opacity: 0
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      opacity: 0
    })

    // Test without opacity (should use default)
    ui = () => (
      <UiEntity
        uiTransform={{
          width: 100
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      opacity: 1 // Default value
    })
  })

  it('should handle falsy zIndex values correctly', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)

    // Test with undefined zIndex (should use default from defaultUiTransform)
    let ui = () => (
      <UiEntity
        uiTransform={{
          zIndex: undefined,
          width: 100
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      zIndex: 0 // Default value should be used
    })

    // Test with null zIndex (should use default from defaultUiTransform)
    ui = () => (
      <UiEntity
        uiTransform={{
          zIndex: null as any,
          width: 100
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      zIndex: 0 // Default value should be used
    })
  })

  it('should handle falsy opacity values correctly', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)

    // Test with undefined opacity (should use default from defaultUiTransform)
    let ui = () => (
      <UiEntity
        uiTransform={{
          opacity: undefined,
          width: 100
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      opacity: 1 // Default value should be used
    })

    // Test with null opacity (should use default from defaultUiTransform)
    ui = () => (
      <UiEntity
        uiTransform={{
          opacity: null as any,
          width: 100
        }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      opacity: 1 // Default value should be used
    })
  })
})
