import React, { useCallback, useEffect, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { SelectField } from '../../SelectField'
import { Dropdown } from '../../../Dropdown'
import { isValid } from './utils'
import type { Props } from './types'

import './PlayAnimationAction.css'

enum PLAY_MODE {
  PLAY_ONCE = 'play-once',
  LOOP = 'loop'
}

const playModeOptions = [
  {
    label: 'Play Once',
    value: PLAY_MODE.PLAY_ONCE
  },
  {
    label: 'Loop',
    value: PLAY_MODE.LOOP
  }
]

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
          <label>Select Animation</label>
          <Dropdown
            options={[
              { value: '', text: 'Select an Animation' },
              ...animations.map((animation) => ({ text: animation.name, value: animation.name }))
            ]}
            value={payload.animation}
            onChange={handleChangeAnimation}
          />
        </div>
        <div className="field">
          <label>Play Mode</label>
          <SelectField
            value={payload.loop ? PLAY_MODE.LOOP : PLAY_MODE.PLAY_ONCE}
            options={playModeOptions}
            onChange={handleChangePlayMode}
          />
        </div>
      </div>
    </div>
  )
}

export default React.memo(PlayAnimationAction)
