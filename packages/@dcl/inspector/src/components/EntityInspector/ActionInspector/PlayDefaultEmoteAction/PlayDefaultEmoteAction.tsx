import React, { useCallback, useEffect, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { Dropdown } from '../../../ui'
import type { Props } from './types'

import './PlayDefaultEmoteAction.css'

function isValid(
  payload: Partial<ActionPayload<ActionType.PLAY_DEFAULT_EMOTE>>
): payload is ActionPayload<ActionType.PLAY_DEFAULT_EMOTE> {
  return typeof payload.emote === 'string' && payload.emote.length > 0
}

const emoteOptions = [
  { value: 'wave', label: 'Wave' },
  { value: 'fistpump', label: 'Fistpump' },
  { value: 'robot', label: 'Robot' },
  { value: 'raiseHand', label: 'Raise Hand' },
  { value: 'clap', label: 'Clap' },
  { value: 'money', label: 'Money' },
  { value: 'kiss', label: 'Kiss' },
  { value: 'tik', label: 'Tik' },
  { value: 'hammer', label: 'Hammer' },
  { value: 'tektonik', label: 'Tektonik' },
  { value: 'dontsee', label: "Don't See" },
  { value: 'handsair', label: 'Hands Air' },
  { value: 'shrug', label: 'Shrug' },
  { value: 'disco', label: 'Disco' },
  { value: 'dab', label: 'Dab' },
  { value: 'headexplode', label: 'Head Explode' },
  { value: 'buttonDown', label: 'Button Down' },
  { value: 'buttonFront', label: 'Button Front' },
  { value: 'getHit', label: 'Get Hit' },
  { value: 'knockOut', label: 'Knock Out' },
  { value: 'lever', label: 'Lever' },
  { value: 'openChest', label: 'Open Chest' },
  { value: 'openDoor', label: 'Open Door' },
  { value: 'punch', label: 'Punch' },
  { value: 'push', label: 'Push' },
  { value: 'swingWeaponOneHand', label: 'Swing Weapon One Hand' },
  { value: 'swingWeaponTwoHands', label: 'Swing Weapon Two Hands' },
  { value: 'throw', label: 'Throw' },
  { value: 'sittingChair1', label: 'Sitting Chair 1' },
  { value: 'sittingChair2', label: 'Sitting Chair 2' },
  { value: 'sittingGround1', label: 'Sitting Ground 1' },
  { value: 'sittingGround2', label: 'Sitting Ground 2' }
]

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
          options={emoteOptions}
          value={payload.emote}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChangeEmote(e)}
        />
      </div>
    </div>
  )
}

export default React.memo(PlayDefaultEmoteAction)
