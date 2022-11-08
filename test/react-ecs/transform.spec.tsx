import { Engine, IEngine, Entity } from '../../packages/@dcl/ecs/src/engine'
import {
  Position,
  PositionUnit,
  ReactEcs,
  renderUi,
  UiEntity,
  YGUnit
} from '../../packages/@dcl/react-ecs/src'

const CANVAS_ROOT_ENTITY = 0
declare const engine: IEngine

describe('UiTransform React Ecs', () => {
  beforeEach(() => {
    ;(globalThis as any).engine = Engine()
  })

  it('should send empty object if uiTransform is undefined', async () => {
    const { UiTransform } = engine.baseComponents
    const entityIndex = engine.addEntity()

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getDiv = (entity: Entity) => UiTransform.get(entity)
    const ui = () => <UiEntity uiTransform={undefined} />
    renderUi(ui)
    engine.update(1)
    expect(getDiv(rootDivEntity).width).toBe(undefined)
  })

  it('should send 0 if you send an invalid px', async () => {
    const { UiTransform } = engine.baseComponents
    const entityIndex = engine.addEntity()

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getDiv = (entity: Entity) => UiTransform.get(entity)
    const ui = () => <UiEntity uiTransform={{ width: 'boedo' as any }} />
    renderUi(ui)
    engine.update(1)
    expect(getDiv(rootDivEntity).width).toBe(undefined)
  })

  it('should send position transform properties', async () => {
    const { UiTransform } = engine.baseComponents
    const entityIndex = engine.addEntity()

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getDiv = (entity: Entity) => UiTransform.get(entity)

    const position: Position = {
      top: '1px',
      left: '2px',
      right: '3%',
      bottom: 4
    }

    const ui = () => <UiEntity uiTransform={{ width: 100, position }} />

    renderUi(ui)
    engine.update(1)

    expect(getDiv(rootDivEntity)).toMatchObject({
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
    expect(getDiv(rootDivEntity)).toMatchObject({
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

    expect(getDiv(rootDivEntity)).toMatchObject({
      positionRight: undefined,
      positionRightUnit: undefined
    })

    position.right = {} as any
    position.left = '10%'
    engine.update(1)
    expect(getDiv(rootDivEntity)).toMatchObject({
      positionRight: undefined,
      positionRightUnit: undefined,
      positionLeft: 10,
      positionLeftUnit: YGUnit.YGU_PERCENT
    })
  })

  it('should send height & width properties', async () => {
    const { UiTransform } = engine.baseComponents
    const entityIndex = engine.addEntity()

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getDiv = (entity: Entity) => UiTransform.get(entity)
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

    renderUi(ui)
    engine.update(1)

    expect(getDiv(rootDivEntity)).toMatchObject({
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
    expect(getDiv(rootDivEntity)).toMatchObject({
      width: 110,
      widthUnit: YGUnit.YGU_POINT
    })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    width = undefined
    engine.update(1)

    expect(getDiv(rootDivEntity)).toMatchObject({
      width: undefined,
      widthUnit: undefined
    })

    width = { boedo: 'casla' } as any
    expect(getDiv(rootDivEntity)).toMatchObject({
      width: undefined,
      widthUnit: undefined
    })
  })
})
