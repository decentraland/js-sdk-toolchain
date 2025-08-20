import React, { useCallback, useEffect, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { Dropdown } from '../../../ui'
import { EMOTE_OPTIONS, type Props } from './types'

import './PlayDefaultEmoteAction.css'

function isValid(
  payload: Partial<ActionPayload<ActionType.PLAY_DEFAULT_EMOTE>>
): payload is ActionPayload<ActionType.PLAY_DEFAULT_EMOTE> {
  return typeof payload.emote === 'string' && payload.emote.length > 0
}

const PlayDefaultEmoteAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.PLAY_DEFAULT_EMOTE>>>({
    ...value
  })

  useEffect(() => {
    if (!recursiveCheck(payload, value, 2) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleChangeEmote = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setPayload({
        ...payload,
        emote: value
      })
    },
    [payload, setPayload]
  )

  return (
    <div className="PlayDefaultEmoteActionContainer">
      <div className="row">
        <Dropdown
          label="Emote"
          placeholder="Select an Emote"
          options={EMOTE_OPTIONS}
          value={payload.emote}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChangeEmote(e)}
        />
      </div>
    </div>
  )
}

export default React.memo(PlayDefaultEmoteAction)
