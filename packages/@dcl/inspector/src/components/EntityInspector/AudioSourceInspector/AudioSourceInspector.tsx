import { useCallback } from 'react'
import cx from 'classnames'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { getComponentValue } from '../../../hooks/sdk/useComponentValue'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { CoreComponents } from '../../../lib/sdk/components'
import { useAppSelector } from '../../../redux/hooks'
import { selectAssetCatalog } from '../../../redux/app'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { CheckboxField, RangeField, FileUploadField } from '../../ui'
import { ACCEPTED_FILE_TYPES } from '../../ui/FileUploadField/types'
import { fromAudioSource, toAudioSource, isValidInput, isAudio, isValidVolume } from './utils'
import type { Props } from './types'

export default withSdk<Props>(({ sdk, entity }) => {
  const files = useAppSelector(selectAssetCatalog)
  const { AudioSource, GltfContainer } = sdk.components

  const hasAudioSource = useHasComponent(entity, AudioSource)
  const handleInputValidation = useCallback(
    ({ audioClipUrl }: { audioClipUrl: string }) => !!files && isValidInput(files, audioClipUrl),
    [files]
  )

  const { getInputProps, isValid } = useComponentInput(
    entity,
    AudioSource,
    fromAudioSource(files?.basePath ?? ''),
    toAudioSource(files?.basePath ?? ''),
    handleInputValidation,
    [files]
  )

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, AudioSource)
    await sdk.operations.dispatch()
    const gltfContainer = getComponentValue(entity, GltfContainer)
    const asset = getAssetByModel(gltfContainer.src)
    analytics.track(Event.REMOVE_COMPONENT, {
      componentName: CoreComponents.AUDIO_SOURCE,
      itemId: asset?.id,
      itemPath: gltfContainer.src
    })
  }, [])

  const handleDrop = useCallback(async (audioClipUrl: string) => {
    const { operations } = sdk
    operations.updateValue(AudioSource, entity, { audioClipUrl })
    await operations.dispatch()
  }, [])

  if (!hasAudioSource) return null

  const playing = getInputProps('playing', (e) => e.target.checked)
  const loop = getInputProps('loop', (e) => e.target.checked)
  const volume = getInputProps('volume', (e) => e.target.value)

  return (
    <Container label="AudioSource" className={cx('AudioSource')} onRemoveContainer={handleRemove}>
      <Block>
        <FileUploadField
          {...getInputProps('audioClipUrl')}
          label="Path"
          accept={ACCEPTED_FILE_TYPES['audio']}
          onDrop={handleDrop}
          error={files && !isValid}
          isValidFile={isAudio}
        />
      </Block>
      <Block label="Playback">
        <CheckboxField label="Start playing" checked={!!playing.value} {...playing} />
        <CheckboxField label="Loop" checked={!!loop.value} {...loop} />
      </Block>
      <Block className="volume">
        <RangeField {...volume} label="Volume" isValidValue={isValidVolume} />
      </Block>
    </Container>
  )
})
