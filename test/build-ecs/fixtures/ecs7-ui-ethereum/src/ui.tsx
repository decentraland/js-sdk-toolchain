/* eslint-disable no-console */
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, {
  ReactEcsRenderer,
  UiEntity,
  Input,
  Dropdown,
  Label,
  Button
} from '../../../../../packages/@dcl/react-ecs'

let selectedIndex: number = 0
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
      textureMode: 'stretch',
      texture: {
        src: 'models/buffa.jpg',
        wrapMode: 'clamp',
        filterMode: 'bi-linear'
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
      onChange={(e) => {
        selectedIndex = e
        console.log(e)
      }}
      selectedIndex={selectedIndex}
    />
    <Input
      placeholder={'SARASA'}
      onChange={(value) => {
        console.log({ value })
      }}
      onSubmit={(value) => console.log('onSubmit', value)}
      uiBackground={{
        color: Color4.Red()
      }}
      uiTransform={{ width: 200, height: 36 }}
    />
    <Label color={{ r: 1, g: 1, b: 1, a: 1 }} value="Some text" fontSize={16} textAlign="middle-center" />
    <Button variant="primary" value="Primary Button" />
    <Button variant="secondary" value="Secondary Button" />
  </UiEntity>
)

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(uiComponent)
}
