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
} from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/ui_transform.gen'
import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('UiTransform component', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const { UiTransform } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    UiTransform.create(entity, {
      parent: 0,
      rightOf: 0,
      alignContent: YGAlign.YGA_CENTER,
      alignItems: YGAlign.YGA_FLEX_END,
      alignSelf: YGAlign.YGA_FLEX_START,
      borderBottom: 1,
      borderLeft: 1,
      borderRight: 1,
      borderTop: 1,
      direction: YGDirection.YGD_LTR,
      display: YGDisplay.YGD_NONE,
      flex: 1,
      flexBasis: 3,
      flexBasisUnit: YGUnit.YGU_POINT,
      flexDirection: YGFlexDirection.YGFD_COLUMN_REVERSE,
      flexWrap: 1,
      flexGrow: 4,
      flexShrink: 1,
      height: 1,
      heightUnit: YGUnit.YGU_POINT,
      justifyContent: YGJustify.YGJ_FLEX_END,
      marginBottom: 1,
      marginBottomUnit: YGUnit.YGU_POINT,
      marginLeft: 1,
      marginLeftUnit: YGUnit.YGU_POINT,
      marginRight: 1,
      marginRightUnit: YGUnit.YGU_POINT,
      marginTop: 1,
      marginTopUnit: YGUnit.YGU_POINT,
      maxHeight: 1,
      maxHeightUnit: YGUnit.YGU_POINT,
      maxWidth: 1,
      maxWidthUnit: YGUnit.YGU_POINT,
      minHeight: 1,
      minHeightUnit: YGUnit.YGU_POINT,
      minWidth: 1,
      minWidthUnit: YGUnit.YGU_POINT,
      overflow: YGOverflow.YGO_VISIBLE,
      paddingBottom: 1,
      paddingBottomUnit: YGUnit.YGU_PERCENT,
      paddingLeft: 1,
      paddingLeftUnit: YGUnit.YGU_UNDEFINED,
      paddingTopUnit: YGUnit.YGU_POINT,
      paddingRight: 1,
      paddingRightUnit: YGUnit.YGU_POINT,
      paddingTop: 1,
      positionBottom: 1,
      positionBottomUnit: YGUnit.YGU_POINT,
      positionLeft: 1,
      positionLeftUnit: YGUnit.YGU_POINT,
      positionRight: 1,
      positionRightUnit: YGUnit.YGU_POINT,
      positionTop: 1,
      positionTopUnit: YGUnit.YGU_POINT,
      positionType: YGPositionType.YGP_RELATIVE,
      width: 1,
      widthUnit: YGUnit.YGU_POINT
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
