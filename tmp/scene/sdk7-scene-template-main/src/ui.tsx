import {
  engine,
  Transform,
  YGAlign,
  YGDisplay,
  YGJustify
} from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'

const uiComponent = () => (
  <UiEntity
    uiTransform={{
      width: 300,
      margin: { top: '70px', left: '245px' },
      padding: { top: 10, bottom: 10, left: 10, right: 10 }
    }}
    uiBackground={{ backgroundColor: Color4.create(0.5, 0.8, 0.1, 0.6) }}
  >
    <UiEntity
      uiTransform={{
        width: '100%',
        justifyContent: YGJustify.YGJ_CENTER,
        alignItems: YGAlign.YGA_CENTER,
        display: YGDisplay.YGD_FLEX
      }}
    >
      <UiEntity
        uiText={{ value: 'SDK 7', fontSize: 32 }}
        uiBackground={{ backgroundColor: Color4.fromHexString('#fbf0f0') }}
      />
    </UiEntity>
    <UiEntity
      uiTransform={{
        width: '100%',
        justifyContent: YGJustify.YGJ_CENTER,
        alignItems: YGAlign.YGA_CENTER,
        display: YGDisplay.YGD_FLEX
      }}
    >
      <UiEntity
        uiText={{ value: `Player: ${getPlayerPosition()}`, fontSize: 18 }}
        uiBackground={{ backgroundColor: Color4.fromHexString('#fbf0f0') }}
      />
    </UiEntity>
  </UiEntity>
  )

  function getPlayerPosition() {
    const playerPosition = Transform.getOrNull(engine.PlayerEntity)
    if (!playerPosition) return ' no data yet'
    const { x, y, z } = playerPosition.position
    return `{X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, z: ${z.toFixed(2)} }`
  }

  export function setupUi() {
    ReactEcsRenderer.setUiRenderer(uiComponent)
  }