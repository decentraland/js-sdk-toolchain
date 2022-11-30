import { Engine, IEngine, Entity, createInputSystem, createPointerEventSystem, YGWrap, YGUnit, components } from '../../packages/@dcl/ecs/src'
import {
  createReactBasedUiSystem,
  Position,
  PositionUnit,
  ReactBasedUiSystem,
  ReactEcs,
  UiEntity,
  CANVAS_ROOT_ENTITY
} from '../../packages/@dcl/react-ecs/src'


describe('UiTransform React Ecs', () => {
  let engine: IEngine
  let uiRenderer: ReactBasedUiSystem

  beforeEach(() => {
    engine = Engine()
    uiRenderer = createReactBasedUiSystem(engine as any, createPointerEventSystem(engine, createInputSystem(engine)) as any)
  })


  it('should send empty object if uiTransform is undefined', async () => {
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addDynamicEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const ui = () => <UiEntity uiTransform={undefined} />
    uiRenderer.setUiRenderer(ui)
    engine.update(1)
    expect(getUiTransform(rootDivEntity).width).toBe(0)
  })

  it('should send 0 if you send an invalid px', async () => {
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addDynamicEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const ui = () => (
      <UiEntity
        uiTransform={{ width: 'boedo' as any, flexWrap: YGWrap.YGW_WRAP as any }}
      />
    )
    uiRenderer.setUiRenderer(ui)
    engine.update(1)
    expect(getUiTransform(rootDivEntity).width).toBe(0)
    expect(getUiTransform(rootDivEntity).flexWrap).toBe(YGWrap.YGW_WRAP)
  })

  it('should send position transform properties', async () => {
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addDynamicEntity() as number

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
    engine.update(1)

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
    engine.update(1)
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
    engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      positionRight: 0,
      positionRightUnit: YGUnit.YGU_UNDEFINED
    })

    position.right = {} as any
    position.left = '10%'
    engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      positionRight: 0,
      positionRightUnit: YGUnit.YGU_UNDEFINED,
      positionLeft: 10,
      positionLeftUnit: YGUnit.YGU_PERCENT
    })
  })

  it('should send height & width properties', async () => {
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addDynamicEntity() as number

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
    engine.update(1)

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
    engine.update(1)
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      width: 110,
      widthUnit: YGUnit.YGU_POINT
    })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    width = undefined
    engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      width: 0,
      widthUnit: YGUnit.YGU_UNDEFINED
    })

    width = { boedo: 'casla' } as any
    expect(getUiTransform(rootDivEntity)).toMatchObject({
      width: 0,
      widthUnit: YGUnit.YGU_UNDEFINED
    })
  })
})
