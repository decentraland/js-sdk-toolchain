import React, { useCallback, useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!recursiveCheck(payload, value, 2) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleChangeAnimation = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setPayload({ ...payload, animation: value })
    },
    [payload, setPayload]
  )

  const handleChangePlayMode = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setPayload({ ...payload, loop: value === PLAY_MODE.LOOP })
    },
    [payload, setPayload]
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
