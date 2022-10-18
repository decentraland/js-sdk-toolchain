import ReactEcs, {
  renderUi,
  UiEntity,
  YGAlign,
  YGDisplay,
  YGJustify
} from '@dcl/react-ecs'

export const uiComponent = () => (
  <UiEntity
    uiTransform={{
      width: 700,
      height: 300,
      margin: { top: '10px', left: '400px' },
      justifyContent: YGJustify.YGJ_CENTER,
      alignItems: YGAlign.YGA_CENTER,
      display: YGDisplay.YGD_FLEX
    }}
    uiBackground={{ backgroundColor: Color4.create(1, 0.1, 0.1, 0.6) }}
  >
    <UiEntity
      uiText={{ value: 'SDK7', fontSize: 120 }}
      uiBackground={{ backgroundColor: Color4.fromHexString('#fbf0f0') }}
    />
  </UiEntity>
)

renderUi(uiComponent)

export {}
