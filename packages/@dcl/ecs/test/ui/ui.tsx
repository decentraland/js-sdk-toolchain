/*
 * @jsx ecsJsx
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import ecsJsx, { DivUi } from '../jsx'

import {
  YGFlexDirection,
  YGPositionType
} from '../../src/components/generated/pb/UiTransform.gen'

export const ui = () => (
  <DivUi
    width={300}
    height={300}
    flexDirection={YGFlexDirection.YGFlexDirectionRow}
  >
    <DivUi width={100} height={100}>
      <DivUi width={100} height={100} />
      <DivUi width={100} height={100} />
    </DivUi>
    <DivUi
      width={100}
      height={100}
      positionType={YGPositionType.YGPositionTypeAbsolute}
    />
    <DivUi width={100} height={100} />
    <DivUi width={100} height={100}>
      <DivUi width={100} height={100} />
      <DivUi width={100} height={100} />
    </DivUi>
  </DivUi>
)
