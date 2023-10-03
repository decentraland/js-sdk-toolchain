import React, { useCallback, useEffect, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'

import { TextField } from '../../TextField'
import { isValid } from './utils'
import type { Props } from './types'

const PlaySoundAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<ActionPayload<ActionType.PLAY_SOUND>>({
    ...value
  })

  useEffect(() => {
    if (!recursiveCheck(payload, value, 2) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleChangeSrc = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setPayload({ ...payload, src: value })
    },
    [payload, setPayload]
  )

  return (
    <div className="PlaySoundActionContainer">
      <div className="row">
        <div className="field">
          <label>Path</label>
          <TextField value={payload.src} onChange={handleChangeSrc} />
        </div>
      </div>
    </div>
  )
}

export default React.memo(PlaySoundAction)
