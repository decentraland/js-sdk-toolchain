import ReactEcs, {
  UiEntity,
  YGDisplay,
  YGJustify,
  YGAlign
} from '@dcl/react-ecs'

export const ui = () => (
  <UiEntity
    uiTransform={{
      width: 500,
      height: 500,
      padding: { top: 10, right: 10, bottom: 10, left: 10 }
    }}
    uiBackground={{ backgroundColor: { r: 10, g: 10, b: 10, a: 0.2 } }}
  >
    <UiEntity
      uiTransform={{
        width: 100,
        height: 100,
        display: YGDisplay.YGDisplayFlex,
        justifyContent: YGJustify.YGJustifyCenter,
        alignItems: YGAlign.YGAlignCenter
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
