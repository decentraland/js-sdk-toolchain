import { YGJustify, YGAlign, YGDisplay } from "@dcl/sdk/ecs";
import { Color4 } from "@dcl/sdk/math";
import ReactEcs, { UiEntity } from "@dcl/sdk/react-ecs";

export const uiComponent = () => (
  <UiEntity
    uiTransform={{
      width: 700,
      height: 400,
      margin: { top: '35px', left: '500px' }
    }}
    uiBackground={{ backgroundColor: Color4.create(0.5, 0.8, 0.1, 0.6) }}
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
      <UiEntity
        uiText={{ value: 'SDK 7', fontSize: 80 }}
        uiBackground={{ backgroundColor: Color4.fromHexString('#fbf0f0') }}
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
      <UiEntity
        uiText={{ value: `Counter:`, fontSize: 60 }}
        uiBackground={{ backgroundColor: Color4.fromHexString('#fbf0f0') }}
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
      <UiEntity
        uiText={{ value: `Player:`, fontSize: 40 }}
        uiBackground={{ backgroundColor: Color4.fromHexString('#fbf0f0') }}
      />
    </UiEntity>
  </UiEntity>
)