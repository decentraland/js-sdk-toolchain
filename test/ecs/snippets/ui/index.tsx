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
    uiBackground={{ backgroundColor: { r: 10, g: 10, b: 10, a: 0.2 } }}
  >
    <UiEntity
      uiTransform={{
        width: 100,
        height: 100,
        display: YGDisplay.YGD_FLEX,
        justifyContent: YGJustify.YGJ_CENTER,
        alignItems: YGAlign.YGA_CENTER
      }}
      uiBackground={{ backgroundColor: { r: 255, g: 45, b: 85, a: 0.2 } }}
    >
      <UiEntity
        uiTransform={{ width: 80, height: 20 }}
        uiText={{ value: 'Boedo', textAlign: 0, fontSize: 12 }}
        uiBackground={{ backgroundColor: { r: 255, g: 45, b: 85, a: 1 } }}
      />
    </UiEntity>
  </UiEntity>
)

renderUi(uiComponent)
