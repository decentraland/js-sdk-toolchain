import {
  YGAlign,
  YGDirection,
  YGDisplay,
  YGFlexDirection,
  YGJustify,
  YGOverflow,
  YGPositionType,
  YGUnit
  // YGUnit
} from '../../../packages/@dcl/ecs/src/components/generated/pb/ecs/components/UiTransform.gen'
import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('UiTransform component', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const { UiTransform } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    UiTransform.create(entity, {
      parent: 0,
      rightOf: 0,
      alignContent: YGAlign.YGAlignCenter,
      alignItems: YGAlign.YGAlignFlexEnd,
      alignSelf: YGAlign.YGAlignFlexStart,
      borderBottom: 1,
      borderLeft: 1,
      borderRight: 1,
      borderTop: 1,
      direction: YGDirection.YGDirectionLTR,
      display: YGDisplay.YGDisplayNone,
      flex: 1,
      flexBasis: 3,
      flexBasisUnit: YGUnit.YGUnitPoint,
      flexDirection: YGFlexDirection.YGFlexDirectionColumnReverse,
      flexWrap: 1,
      flexGrow: 4,
      flexShrink: 1,
      height: 1,
      heightUnit: YGUnit.YGUnitPoint,
      justifyContent: YGJustify.YGJustifyFlexEnd,
      marginBottom: 1,
      marginBottomUnit: YGUnit.YGUnitPoint,
      marginLeft: 1,
      marginLeftUnit: YGUnit.YGUnitPoint,
      marginRight: 1,
      marginRightUnit: YGUnit.YGUnitPoint,
      marginTop: 1,
      marginTopUnit: YGUnit.YGUnitPoint,
      maxHeight: 1,
      maxHeightUnit: YGUnit.YGUnitPoint,
      maxWidth: 1,
      maxWidthUnit: YGUnit.YGUnitPoint,
      minHeight: 1,
      minHeightUnit: YGUnit.YGUnitPoint,
      minWidth: 1,
      minWidthUnit: YGUnit.YGUnitPoint,
      overflow: YGOverflow.YGOverflowVisible,
      paddingBottom: 1,
      paddingBottomUnit: YGUnit.YGUnitPercent,
      paddingLeft: 1,
      paddingLeftUnit: YGUnit.YGUnitUndefined,
      paddingTopUnit: YGUnit.YGUnitPoint,
      paddingRight: 1,
      paddingRightUnit: YGUnit.YGUnitPoint,
      paddingTop: 1,
      positionBottom: 1,
      positionBottomUnit: YGUnit.YGUnitPoint,
      positionLeft: 1,
      positionLeftUnit: YGUnit.YGUnitPoint,
      positionRight: 1,
      positionRightUnit: YGUnit.YGUnitPoint,
      positionTop: 1,
      positionTopUnit: YGUnit.YGUnitPoint,
      positionType: YGPositionType.YGPositionTypeRelative,
      width: 1,
      widthUnit: YGUnit.YGUnitPoint
    })
    // uiTransform.marginBottomUnit = YGUnit.YGUnitPercent

    const buffer = UiTransform.toBinary(entity)
    UiTransform.upsertFromBinary(entity, buffer)
    const entityB = newEngine.addEntity()
    expect(UiTransform.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...UiTransform.get(entity)
    })
  })
})
