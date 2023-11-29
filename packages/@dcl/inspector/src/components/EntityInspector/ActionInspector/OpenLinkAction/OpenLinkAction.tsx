import React, { useCallback, useEffect, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import type { Props } from './types'
import { TextField } from '../../../ui'

import './OpenLinkAction.css'

function isValid(
  payload: Partial<ActionPayload<ActionType.OPEN_LINK>>
): payload is ActionPayload<ActionType.OPEN_LINK> {
  return typeof payload.url === 'string' && payload.url.length > 0
}

const OpenLinkAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.OPEN_LINK>>>({
    ...value
  })

  useEffect(() => {
    if (!recursiveCheck(payload, value, 2) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleChangeEmote = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({
        ...payload,
        url: value
      })
    },
    [payload, setPayload]
  )

  return (
    <div className="OpenLinkActionContainer">
      <div className="row">
        <TextField
          label="URL"
          value={payload.url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeEmote(e)}
        />
      </div>
    </div>
  )
}

export default React.memo(OpenLinkAction)
