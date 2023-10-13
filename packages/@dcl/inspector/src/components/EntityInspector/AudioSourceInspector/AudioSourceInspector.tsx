import { useCallback } from 'react'
import { Item } from 'react-contexify'
import { useDrop } from 'react-dnd'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'
import cx from 'classnames'

import { ContextMenu as Menu } from '../../ContexMenu'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
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
import { TextField } from '../TextField'
import { RangeField } from '../RangeField'
import { fromAudioSource, toAudioSource, isValidInput, isAudio, isValidVolume } from './utils'
import type { Props } from './types'

import './AudioSourceInspector.css'

const DROP_TYPES = ['project-asset']

export default withSdk<Props>(
  withContextMenu<WithSdkProps & Props>(({ sdk, entity, contextMenuId }) => {
    const files = useAppSelector(selectAssetCatalog)
    const { handleAction } = useContextMenu()
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
        parentItemId: asset?.id || ''
      })
    }, [])
    const handleDrop = useCallback(async (audioClipUrl: string) => {
      const { operations } = sdk
      operations.updateValue(AudioSource, entity, { audioClipUrl })
      await operations.dispatch()
    }, [])

    const [{ isHover }, drop] = useDrop(
      () => ({
        accept: DROP_TYPES,
        drop: ({ value, context }: ProjectAssetDrop, monitor) => {
          if (monitor.didDrop()) return
          const node = context.tree.get(value)!
          const model = getNode(node, context.tree, isAudio)
          if (model) void handleDrop(withAssetDir(model.asset.src))
        },
        canDrop: ({ value, context }: ProjectAssetDrop) => {
          const node = context.tree.get(value)!
          return !!getNode(node, context.tree, isAudio)
        },
        collect: (monitor) => ({
          isHover: monitor.canDrop() && monitor.isOver()
        })
      }),
      [files]
    )

    if (!hasAudioSource) return null

    const playing = getInputProps('playing', (e) => e.target.checked)
    const loop = getInputProps('loop', (e) => e.target.checked)
    const volume = getInputProps('volume', (e) => e.target.value)

    return (
      <Container label="AudioSource" className={cx('AudioSource', { hover: isHover })}>
        <Menu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </Menu>
        <Block label="Path" ref={drop}>
          <TextField type="text" {...getInputProps('audioClipUrl')} error={files && !isValid} drop={isHover} />
        </Block>
        <Block label="Playback">
          <TextField label="Start playing" type="checkbox" checked={!!playing.value} {...playing} />
          <TextField label="Loop" type="checkbox" checked={!!loop.value} {...loop} />
        </Block>
        <Block className="volume" label="Volume">
          <RangeField {...volume} />
          <TextField type="number" {...volume} error={!isValidVolume(volume.value?.toString())} />
        </Block>
      </Container>
    )
  })
)
