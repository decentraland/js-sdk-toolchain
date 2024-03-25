import React, { useCallback } from 'react'
import { useDrop } from 'react-dnd'
import cx from 'classnames'
import { Entity } from '@dcl/ecs'
import { withSdk, WithSdkProps } from '../../../../hoc/withSdk'
import { useHasComponent } from '../../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../../hooks/sdk/useComponentInput'
import { ProjectAssetDrop, getNode } from '../../../../lib/sdk/drag-drop'
import { withAssetDir } from '../../../../lib/data-layer/host/fs-utils'
import { useAppSelector } from '../../../../redux/hooks'
import { selectAssetCatalog } from '../../../../redux/app'
import { Block } from '../../../Block'
import { TextField, CheckboxField, RangeField } from '../../../ui'
import { fromVideoPlayer, toVideoPlayer, isValidInput, isVideo, isValidVolume } from '../../VideoPlayerInspector/utils'

const DROP_TYPES = ['project-asset']

export default React.memo(
  withSdk<WithSdkProps & { entity: Entity }>(({ sdk, entity }) => {
    const { VideoPlayer } = sdk.components
    const files = useAppSelector(selectAssetCatalog)
    const hasVideoPlayer = useHasComponent(entity, VideoPlayer)

    const handleInputValidation = useCallback(
      ({ src }: { src: string }) => !!files && isValidInput(files, src),
      [files]
    )

    const { getInputProps, isValid } = useComponentInput(
      entity,
      VideoPlayer,
      fromVideoPlayer(files?.basePath ?? ''),
      toVideoPlayer(files?.basePath ?? ''),
      handleInputValidation,
      [files]
    )

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
      <div className={cx({ hover: isHover })}>
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
      </div>
    )
  })
)
