import { Engine, IEngine, Entity } from '../../../packages/@dcl/ecs/src/engine'
import {
  Position,
  ReactEcs,
  renderUi,
  UiEntity,
  YGUnit
} from '../../../packages/@dcl/react-ecs/src'

const CANVAS_ROOT_ENTITY = 0
declare const engine: IEngine

describe('UiTransform React Ecs', () => {
  beforeEach(() => {
    ;(globalThis as any).engine = Engine()
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
      bottom: '4px'
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
      positionRight: 0,
      positionRightUnit: YGUnit.YGU_UNDEFINED
    })

    position.right = {} as any
    position.left = '10%'
    engine.update(1)
    expect(getDiv(rootDivEntity)).toMatchObject({
      positionRight: 0,
      positionRightUnit: YGUnit.YGU_UNDEFINED,
      positionLeft: 10,
      positionLeftUnit: YGUnit.YGU_PERCENT
    })
  })
})
