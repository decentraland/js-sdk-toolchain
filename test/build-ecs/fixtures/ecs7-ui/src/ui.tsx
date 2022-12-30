import {
  TextureWrapMode,
  TextureFilterMode,
  BackgroundTextureMode,
  TextAlignMode
} from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, {
  ReactEcsRenderer,
  UiEntity,
  Input,
  Dropdown,
  Label,
  Button
} from '../../../../../packages/@dcl/react-ecs/dist'

const uiComponent = () => (
  <UiEntity
    onMouseDown={() => {
      console.log('MOUSE_DOWN event')
    }}
    onMouseUp={() => {
      console.log('MOUSE_UP event')
    }}
    uiTransform={{
      width: 900,
      height: 500,
      margin: {
        left: 270,
        top: 16
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
      uiBackground={{
        color: Color4.Blue()
      }}
      color={Color4.Red()}
      options={['BOEDO', 'CASLA']}
      uiTransform={{ width: 200, height: 36 }}
    />
    <Input
      placeholder={'SARASA'}
      onChange={(value) => {
        console.log({ value })
      }}
      uiBackground={{
        color: Color4.Red()
      }}
      uiTransform={{ width: 200, height: 36 }}
    />
    <Label
      color={{ r: 1, g: 1, b: 1, a: 1 }}
      value="Some text"
      fontSize={16}
      textAlign={TextAlignMode.TAM_MIDDLE_CENTER}
    />
    <Button type="primary" value="Primary Button" />
    <Button type="secondary" value="Secondary Button" />
  </UiEntity>
)

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(uiComponent)
}
