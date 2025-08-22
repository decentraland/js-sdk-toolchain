import React, { useCallback, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { Dropdown } from '../../../ui/Dropdown'
import { isValid } from './utils'
import { PLAY_MODE, PLAY_MODE_OPTIONS, type Props } from './types'

import './PlayAnimationAction.css'

const PlayAnimationAction: React.FC<Props> = ({ value, animations, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.PLAY_ANIMATION>>>({
    ...value
  })

  const handleUpdate = useCallback(
    (_payload: Partial<ActionPayload<ActionType.PLAY_ANIMATION>>) => {
      setPayload(_payload)
      if (!recursiveCheck(_payload, value, 2) || !isValid(_payload)) return
      onUpdate(_payload)
    },
    [setPayload, value, onUpdate]
  )

  const handleChangeAnimation = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      handleUpdate({ ...payload, animation: value })
    },
    [payload, handleUpdate]
  )

  const handleChangePlayMode = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      handleUpdate({ ...payload, loop: value === PLAY_MODE.LOOP })
    },
    [payload, handleUpdate]
  )

  return (
    <div className="PlayAnimationActionContainer">
      <div className="row">
        <div className="field">
          <Dropdown
            label="Select Animation"
            placeholder="Select an Animation"
            options={[...animations.map((animation) => ({ label: animation.name, value: animation.name }))]}
            value={payload.animation}
            onChange={handleChangeAnimation}
          />
        </div>
        <div className="field">
          <Dropdown
            label="Play Mode"
            value={payload.loop ? PLAY_MODE.LOOP : PLAY_MODE.PLAY_ONCE}
            options={PLAY_MODE_OPTIONS}
            onChange={handleChangePlayMode}
          />
        </div>
      </div>
    </div>
  )
}

export default React.memo(PlayAnimationAction)
