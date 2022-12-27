import {
  TextureWrapMode,
  TextureFilterMode,
  BackgroundTextureMode
} from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, {
  ReactEcsRenderer,
  UiEntity,
  Input,
  Dropdown
} from '../../../../../packages/@dcl/react-ecs/dist'

let globalIndex = -1

const uiComponent = () => (
  <UiEntity
    onMouseDown={() => {
      console.log('MOUSE_DOWN event')
    }}
    onMouseUp={() => {
      console.log('MOUSE_UP event')
    }}
    uiTransform={{
      width: 500,
      height: 500,
      position: {
        left: 200,
        top: 200
      }
    }}
    uiBackground={{
      color: Color4.fromInts(231, 255, 255, 150),
      textureMode: BackgroundTextureMode.STRETCH,
      texture: {
        src: 'models/buffa.jpg',
        wrapMode: TextureWrapMode.TWM_CLAMP,
        filterMode: TextureFilterMode.TFM_BILINEAR
      },
      textureSlices: {
        top: 0.46,
        left: 0.59,
        right: 0.47,
        bottom: 0.38
      }
    }}
  >
    <Dropdown
      color={Color4.Red()}
      disabled={false}
      selectedIndex={globalIndex}
      options={['BOEDO', 'CASLA']}
      onChange={(index) => {
        globalIndex = index
      }}
      uiTransform={{
        width: 200,
        height: 200
      }}
    />
    <Input
      placeholder={'SARASA'}
      color={Color4.Blue()}
      onChange={(value) => {
        console.log({ value })
      }}
      uiTransform={{ width: 200, height: 120 }}
    />
  </UiEntity>
)

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(uiComponent)
}
