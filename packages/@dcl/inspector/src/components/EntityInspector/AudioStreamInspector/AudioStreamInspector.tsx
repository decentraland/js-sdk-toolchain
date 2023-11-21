import { useCallback } from 'react'
import cx from 'classnames'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { getComponentValue } from '../../../hooks/sdk/useComponentValue'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { CoreComponents } from '../../../lib/sdk/components'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField, CheckboxField, RangeField } from '../../ui'
import { fromAudioStream, toAudioStream, isValidInput, isValidVolume } from './utils'
import type { Props } from './types'

export default withSdk<Props>(({ sdk, entity }) => {
  const { AudioStream, GltfContainer } = sdk.components

  const hasAudioStream = useHasComponent(entity, AudioStream)
  const handleInputValidation = useCallback(({ url }: { url: string }) => isValidInput(url), [])
  const { getInputProps, isValid } = useComponentInput(
    entity,
    AudioStream,
    fromAudioStream,
    toAudioStream,
    handleInputValidation
  )

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, AudioStream)
    await sdk.operations.dispatch()
    const gltfContainer = getComponentValue(entity, GltfContainer)
    const asset = getAssetByModel(gltfContainer.src)
    analytics.track(Event.REMOVE_COMPONENT, {
      componentName: CoreComponents.AUDIO_SOURCE,
      itemId: asset?.id,
      itemPath: gltfContainer.src
    })
  }, [])

  if (!hasAudioStream) return null

  const url = getInputProps('url')
  const playing = getInputProps('playing', (e) => e.target.checked)
  const volume = getInputProps('volume', (e) => e.target.value)

  return (
    <Container label="AudioStream" className={cx('AudioStream')} onRemoveContainer={handleRemove}>
      <Block label="Url">
        <TextField type="text" {...url} error={!isValid} />
      </Block>
      <Block label="Playback">
        <CheckboxField label="Start playing" checked={!!playing.value} {...playing} />
      </Block>
      <Block className="volume" label="Volume">
        <RangeField {...volume} isValidValue={isValidVolume} />
      </Block>
    </Container>
  )
})
