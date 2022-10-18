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
      width: 500,
      height: 500,
      padding: { top: '10px', left: '10px' }
    }}
    uiBackground={{ backgroundColor: Color4.create(0.1, 0.1, 0.1, 0.1) }}
  >
    <UiEntity
      uiTransform={{
        width: 100,
        height: 100,
        display: YGDisplay.YGD_FLEX,
        justifyContent: YGJustify.YGJ_CENTER,
        alignItems: YGAlign.YGA_CENTER
      }}
      uiBackground={{ backgroundColor: Color4.fromHexString('#fbf0f0') }}
    >
      <UiEntity
        uiTransform={{ width: 80, height: 20 }}
        uiText={{ value: 'Boedo', textAlign: 0, fontSize: 12 }}
        uiBackground={{ backgroundColor: Color4.Red() }}
      />
    </UiEntity>
  </UiEntity>
)

renderUi(uiComponent)
