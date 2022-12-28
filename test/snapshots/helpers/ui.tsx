import { YGJustify, YGAlign, YGDisplay } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { UiEntity, Text } from '@dcl/sdk/react-ecs'

export const uiComponent = () => (
  <UiEntity
    uiTransform={{
      width: 700,
      height: 400,
      margin: { top: '35px', left: '500px' }
    }}
    uiBackground={{ color: Color4.create(0.5, 0.8, 0.1, 0.6) }}
  >
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '20%',
        justifyContent: YGJustify.YGJ_CENTER,
        alignItems: YGAlign.YGA_CENTER,
        display: YGDisplay.YGD_FLEX
      }}
    >
      <Text
        value={'SDK 7'}
        fontSize={80}
        uiBackground={{ color: Color4.fromHexString('#fbf0f0') }}
      />
    </UiEntity>
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '20%',
        justifyContent: YGJustify.YGJ_CENTER,
        alignItems: YGAlign.YGA_CENTER,
        display: YGDisplay.YGD_FLEX
      }}
    >
      <Text
        value={`Counter:`}
        fontSize={60}
        uiBackground={{ color: Color4.fromHexString('#fbf0f0') }}
      />
    </UiEntity>
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100px',
        justifyContent: YGJustify.YGJ_CENTER,
        alignItems: YGAlign.YGA_CENTER,
        display: YGDisplay.YGD_FLEX
      }}
    >
      <Text
        value={`Player:`}
        fontSize={40}
        uiBackground={{ color: Color4.fromHexString('#fbf0f0') }}
      />
    </UiEntity>
  </UiEntity>
)
