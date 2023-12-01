import { useCallback } from 'react'
import { useDrop } from 'react-dnd'
import cx from 'classnames'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { getComponentValue } from '../../../hooks/sdk/useComponentValue'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { CoreComponents } from '../../../lib/sdk/components'
import { ProjectAssetDrop, getNode } from '../../../lib/sdk/drag-drop'
import { withAssetDir } from '../../../lib/data-layer/host/fs-utils'
import { useAppSelector } from '../../../redux/hooks'
import { selectAssetCatalog } from '../../../redux/app'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField, CheckboxField, RangeField, InfoTooltip } from '../../ui'
import { fromVideoPlayer, toVideoPlayer, isValidInput, isVideo, isValidVolume } from './utils'
import type { Props } from './types'

const DROP_TYPES = ['project-asset']

export default withSdk<Props>(({ sdk, entity }) => {
  const files = useAppSelector(selectAssetCatalog)
  const { VideoPlayer, GltfContainer } = sdk.components

  const hasVideoPlayer = useHasComponent(entity, VideoPlayer)
  const handleInputValidation = useCallback(({ src }: { src: string }) => !!files && isValidInput(files, src), [files])
  const { getInputProps, isValid } = useComponentInput(
    entity,
    VideoPlayer,
    fromVideoPlayer(files?.basePath ?? ''),
    toVideoPlayer(files?.basePath ?? ''),
    handleInputValidation,
    [files]
  )

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, VideoPlayer)
    await sdk.operations.dispatch()
    const gltfContainer = getComponentValue(entity, GltfContainer)
    const asset = getAssetByModel(gltfContainer.src)
    analytics.track(Event.REMOVE_COMPONENT, {
      componentName: CoreComponents.VIDEO_PLAYER,
      itemId: asset?.id,
      itemPath: gltfContainer.src
    })
  }, [])
  const handleDrop = useCallback(async (src: string) => {
    const { operations } = sdk
    operations.updateValue(VideoPlayer, entity, { src })
    await operations.dispatch()
  }, [])

  const [{ isHover }, drop] = useDrop(
    () => ({
      accept: DROP_TYPES,
      drop: ({ value, context }: ProjectAssetDrop, monitor) => {
        if (monitor.didDrop()) return
        const node = context.tree.get(value)!
        const model = getNode(node, context.tree, isVideo)
        if (model) void handleDrop(withAssetDir(model.asset.src))
      },
      canDrop: ({ value, context }: ProjectAssetDrop) => {
        const node = context.tree.get(value)!
        return !!getNode(node, context.tree, isVideo)
      },
      collect: (monitor) => ({
        isHover: monitor.canDrop() && monitor.isOver()
      })
    }),
    [files]
  )

  if (!hasVideoPlayer) return null

  const playing = getInputProps('playing', (e) => e.target.checked)
  const loop = getInputProps('loop', (e) => e.target.checked)
  const volume = getInputProps('volume', (e) => e.target.value)

  return (
    <Container
      label="VideoPlayer"
      className={cx('VideoPlayer', { hover: isHover })}
      rightContent={
        <InfoTooltip
          text="In case of using an URL, it must be an https URL (http URLs aren’t supported), and the source should have CORS policies (Cross Origin Resource Sharing) that permit externally accessing it"
          link="https://docs.decentraland.org/creator/development-guide/sdk7/audio-streaming"
          type="help"
        />
      }
      onRemoveContainer={handleRemove}
    >
      <Block label="Path/URL" ref={drop}>
        <TextField type="text" {...getInputProps('src')} error={files && !isValid} drop={isHover} />
      </Block>
      <Block label="Playback">
        <CheckboxField label="Start playing" checked={!!playing.value} {...playing} />
        <CheckboxField label="Loop" checked={!!loop.value} {...loop} />
      </Block>
      <Block className="volume" label="Volume">
        <RangeField {...volume} isValidValue={isValidVolume} />
      </Block>
    </Container>
  )
})
