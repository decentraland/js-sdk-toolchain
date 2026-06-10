// Validates the storybook-style catalog: CSF-lite stories rendered in isolation.
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label, UiEntity } from '@dcl/sdk/react-ecs'

export default { title: 'Kitchen Sink/Badge' }

const Badge = (props: { text: string; color: Color4 }) => (
  <UiEntity
    uiTransform={{ padding: { top: 6, bottom: 6, left: 16, right: 16 }, borderRadius: 14, alignItems: 'center' }}
    uiBackground={{ color: props.color }}
  >
    <Label value={props.text} fontSize={14} color={Color4.White()} />
  </UiEntity>
)

export const Success = () => <Badge text="success" color={Color4.create(0.18, 0.65, 0.35, 1)} />
export const Warning = () => <Badge text="warning" color={Color4.create(0.85, 0.6, 0.1, 1)} />
export const Danger = () => <Badge text="danger" color={Color4.create(0.8, 0.2, 0.25, 1)} />
export const Row = () => (
  <UiEntity uiTransform={{ flexDirection: 'row' }}>
    <UiEntity uiTransform={{ margin: { right: 10 } }}><Badge text="a" color={Color4.create(0.3, 0.4, 0.9, 1)} /></UiEntity>
    <UiEntity uiTransform={{ margin: { right: 10 } }}><Badge text="b" color={Color4.create(0.6, 0.3, 0.8, 1)} /></UiEntity>
    <Badge text="c" color={Color4.create(0.2, 0.6, 0.6, 1)} />
  </UiEntity>
)
