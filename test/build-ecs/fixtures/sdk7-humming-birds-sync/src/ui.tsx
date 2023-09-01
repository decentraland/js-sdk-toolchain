import { engine, PointerEvents } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { Bird } from './hummingBird'

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(() => (
    <UiEntity
      uiTransform={{
        width: 300,
        height: 130,
        margin: '16px 0 8px 270px',
        padding: 4
      }}
      uiBackground={{ color: Color4.create(0.5, 0.8, 0.1, 0.6) }}
    >
      <UiEntity
        uiTransform={{
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
        uiBackground={{ color: Color4.fromHexString('#70ac76ff') }}
      >
        <UiEntity
          uiTransform={{
            width: '100%',
            height: 50,
            margin: '8px 0'
          }}
          uiBackground={{
            textureMode: 'center',
            texture: {
              src: 'images/scene-thumbnail.png'
            }
          }}
          uiText={{ value: 'HummingBirds Sync', fontSize: 18 }}
        />
        <Label
          value={`# Birds: ${[...engine.getEntitiesWith(Bird, PointerEvents)].length}`}
          fontSize={18}
          uiTransform={{ width: '100%', height: 100 }}
        />
      </UiEntity>
    </UiEntity>
  ))
}
