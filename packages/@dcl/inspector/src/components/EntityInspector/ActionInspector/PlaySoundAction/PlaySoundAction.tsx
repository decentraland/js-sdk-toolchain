import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDrop } from 'react-dnd'
import { VscQuestion as QuestionIcon } from 'react-icons/vsc'
import { Popup } from 'decentraland-ui/dist/components/Popup/Popup'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'

import { DropTypesEnum, ProjectAssetDrop, getNode } from '../../../../lib/sdk/drag-drop'
import { withAssetDir } from '../../../../lib/data-layer/host/fs-utils'
import { isAudio } from '../../AudioSourceInspector/utils'
import { TextField } from '../../TextField'
import { SelectField } from '../../SelectField'
import { useAppSelector } from '../../../../redux/hooks'
import { selectAssetCatalog } from '../../../../redux/app'
import { isValid } from './utils'
import type { Props } from './types'

import './PlaySoundAction.css'

enum PLAY_MODE {
  PLAY_ONCE = 'play-once',
  LOOP = 'loop'
}

const options = [
  {
    label: 'Play Once',
    value: PLAY_MODE.PLAY_ONCE
  },
  {
    label: 'Loop',
    value: PLAY_MODE.LOOP
  }
]

const PlaySoundAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<ActionPayload<ActionType.PLAY_SOUND>>({
    ...value
  })

  const files = useAppSelector(selectAssetCatalog)

  const removeBase = useCallback(
    (path: string) => {
      return files?.basePath ? path.replace(files.basePath + '/', '') : path
    },
    [files]
  )

  const addBase = useCallback(
    (path: string) => {
      return files?.basePath ? `${files.basePath}/${path}` : path
    },
    [files]
  )

  useEffect(() => {
    if (!recursiveCheck(payload, value, 2) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleChangeSrc = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setPayload({ ...payload, src: addBase(value) })
    },
    [payload, setPayload]
  )

  const handleChangePlayMode = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setPayload({ ...payload, loop: value === PLAY_MODE.LOOP })
    },
    [payload, setPayload]
  )

  const [{ isHover }, drop] = useDrop(
    () => ({
      accept: [DropTypesEnum.ProjectAsset],
      drop: ({ value, context }: ProjectAssetDrop, monitor) => {
        if (monitor.didDrop()) return
        const node = context.tree.get(value)!
        const audio = getNode(node, context.tree, isAudio)
        if (audio) {
          setPayload({ ...payload, src: withAssetDir(audio.asset.src) })
        }
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

  const error = useMemo(() => {
    return !files || !files.assets.some(($) => $.path === payload.src)
  }, [files, payload])

  const renderPathInfo = () => {
    return (
      <Popup
        content={<>You can drag and drop an audio file from the Local Assets</>}
        trigger={<QuestionIcon size={16} />}
        position="right center"
        on="hover"
        hideOnScroll
        hoverable
      />
    )
  }

  return (
    <div className="PlaySoundActionContainer">
      <div className="row">
        <div className="field" ref={drop}>
          <label>Path {renderPathInfo()}</label>
          <TextField value={removeBase(payload.src)} onChange={handleChangeSrc} error={error} drop={isHover} />
        </div>
        <div className="field">
          <label>Play Mode</label>
          <SelectField
            value={payload.loop ? PLAY_MODE.LOOP : PLAY_MODE.PLAY_ONCE}
            options={options}
            onChange={handleChangePlayMode}
          />
        </div>
      </div>
    </div>
  )
}

export default React.memo(PlaySoundAction)
