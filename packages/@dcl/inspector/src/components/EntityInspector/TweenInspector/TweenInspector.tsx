import { useCallback, useEffect } from 'react'
import cx from 'classnames'
import { EasingFunction } from '@dcl/ecs'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { getComponentValue } from '../../../hooks/sdk/useComponentValue'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { CoreComponents } from '../../../lib/sdk/components'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField, CheckboxField, InfoTooltip, Dropdown, RangeField } from '../../ui'
import { fromTween, toTween, fromTweenSequence, toTweenSequence } from './utils'
import type { Props } from './types'
import { TweenType } from '@dcl/asset-packs'

const TweenMapOption: Record<string, string> = {
  [TweenType.MOVE_ITEM]: 'Move Item',
  [TweenType.ROTATE_ITEM]: 'Rotate Item',
  [TweenType.SCALE_ITEM]: 'Scale Item'
}

const EasingFunctionOptions = [
  EasingFunction.EF_LINEAR,
  EasingFunction.EF_EASEINQUAD,
  EasingFunction.EF_EASEOUTQUAD,
  EasingFunction.EF_EASEQUAD,
  EasingFunction.EF_EASEINSINE,
  EasingFunction.EF_EASEOUTSINE,
  EasingFunction.EF_EASESINE,
  EasingFunction.EF_EASEINEXPO,
  EasingFunction.EF_EASEOUTEXPO,
  EasingFunction.EF_EASEEXPO,
  EasingFunction.EF_EASEINELASTIC,
  EasingFunction.EF_EASEOUTELASTIC,
  EasingFunction.EF_EASEELASTIC,
  EasingFunction.EF_EASEINBOUNCE,
  EasingFunction.EF_EASEOUTBOUNCE,
  EasingFunction.EF_EASEBOUNCE
]

const EasingFunctionMapOption: Record<string, string> = {
  [EasingFunction.EF_LINEAR]: 'Linear',
  [EasingFunction.EF_EASEINQUAD]: 'Ease in Quad',
  [EasingFunction.EF_EASEOUTQUAD]: 'Ease out Quad',
  [EasingFunction.EF_EASEQUAD]: 'Ease Quad',
  [EasingFunction.EF_EASEINSINE]: 'Ease in Sine',
  [EasingFunction.EF_EASEOUTSINE]: 'Ease out Sine',
  [EasingFunction.EF_EASESINE]: 'Ease in/out Sine',
  [EasingFunction.EF_EASEINEXPO]: 'Ease in Expo',
  [EasingFunction.EF_EASEOUTEXPO]: 'Ease out Expo',
  [EasingFunction.EF_EASEEXPO]: 'Ease in/out Expo',
  [EasingFunction.EF_EASEINELASTIC]: 'Ease in Elastic',
  [EasingFunction.EF_EASEOUTELASTIC]: 'Ease out Elastic',
  [EasingFunction.EF_EASEELASTIC]: 'Ease in/out Elastic',
  [EasingFunction.EF_EASEINBOUNCE]: 'Ease in Bounce',
  [EasingFunction.EF_EASEOUTBOUNCE]: 'Ease out Bounce',
  [EasingFunction.EF_EASEBOUNCE]: 'Ease in/out Bounce'
}

export default withSdk<Props>(({ sdk, entity }) => {
  const { Tween, TweenSequence, GltfContainer } = sdk.components
  const hasTween = useHasComponent(entity, Tween)
  const hasTweenSequence = useHasComponent(entity, TweenSequence)
  const { getInputProps: getTweenInputProps } = useComponentInput(entity, Tween, fromTween, toTween)
  const { getInputProps: getTweenSequenceInputProps } = useComponentInput(
    entity,
    TweenSequence,
    fromTweenSequence,
    toTweenSequence
  )

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, Tween)
    await sdk.operations.dispatch()
    sdk.operations.removeComponent(entity, TweenSequence)
    await sdk.operations.dispatch()
    const gltfContainer = getComponentValue(entity, GltfContainer)
    const asset = getAssetByModel(gltfContainer.src)
    analytics.track(Event.REMOVE_COMPONENT, {
      componentName: CoreComponents.VIDEO_PLAYER,
      itemId: asset?.id,
      itemPath: gltfContainer.src
    })
  }, [])

  useEffect(() => {
    if (!hasTween) return
    if (!hasTweenSequence) {
      sdk.operations.addComponent(entity, TweenSequence.componentId)
      void sdk.operations.dispatch()
    }
  }, [hasTween, hasTweenSequence])

  if (!hasTween || !hasTweenSequence) return null

  const playing = getTweenInputProps('playing', (e) => e.target.checked)
  const loop = getTweenSequenceInputProps('loop', (e) => e.target.checked)

  return (
    <Container
      label="Tween"
      className={cx('Tween')}
      rightContent={
        <InfoTooltip
          text="More information related the tweens in the following link."
          link="https://docs.decentraland.org/creator/development-guide/sdk7/move-entities"
          type="help"
        />
      }
      onRemoveContainer={handleRemove}
    >
      <Block label="Tween Type">
        <Dropdown
          placeholder="Select a Tween Type"
          options={[
            ...Object.values(TweenType).map((tweenType) => ({ label: TweenMapOption[tweenType], value: tweenType }))
          ]}
          {...getTweenInputProps('type')}
        />
      </Block>
      <Block label="Start">
        <TextField leftLabel="X" type="number" {...getTweenInputProps('start.x')} />
        <TextField leftLabel="Y" type="number" {...getTweenInputProps('start.y')} />
        <TextField leftLabel="Z" type="number" {...getTweenInputProps('start.z')} />
      </Block>
      <Block label="End">
        <TextField leftLabel="X" type="number" {...getTweenInputProps('end.x')} />
        <TextField leftLabel="Y" type="number" {...getTweenInputProps('end.y')} />
        <TextField leftLabel="Z" type="number" {...getTweenInputProps('end.z')} />
      </Block>
      <Block>
        <RangeField step={0.1} label="Duration" {...getTweenInputProps('duration')} />
      </Block>
      <Block>
        <Dropdown
          label="Easing Function"
          options={[
            ...EasingFunctionOptions.map((easingFunctionType) => ({
              label: EasingFunctionMapOption[easingFunctionType],
              value: easingFunctionType
            }))
          ]}
          {...getTweenInputProps('easingFunction')}
        />
      </Block>
      <Block>
        <CheckboxField label="Auto start" checked={!!playing.value} {...playing} />
        <CheckboxField label="Loop" checked={!!loop.value} {...loop} />
      </Block>
    </Container>
  )
})
