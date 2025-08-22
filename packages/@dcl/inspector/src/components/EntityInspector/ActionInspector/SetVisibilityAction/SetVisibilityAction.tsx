import React, { useCallback, useState } from 'react'
import { ActionPayload, ActionType, Colliders } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { Block } from '../../../Block'
import { Dropdown, InfoTooltip } from '../../../ui'
import { COLLISION_LAYERS } from '../../GltfInspector/utils'
import type { Props } from './types'

import './SetVisibilityAction.css'

function isValid(
  payload: Partial<ActionPayload<ActionType.SET_VISIBILITY>>
): payload is ActionPayload<ActionType.SET_VISIBILITY> {
  return payload.visible !== undefined
}

const SetVisibilityAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.SET_VISIBILITY>>>({
    ...value
  })

  const handleUpdate = useCallback(
    (_payload: Partial<ActionPayload<ActionType.SET_VISIBILITY>>) => {
      setPayload(_payload)
      if (!recursiveCheck(_payload, value, 2) || !isValid(_payload)) return
      onUpdate(_payload)
    },
    [setPayload, value, onUpdate]
  )

  const handleSetVisible = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      const visible = value === 'true'
      handleUpdate({
        ...payload,
        visible,
        collider: visible ? payload.collider : Colliders.CL_NONE
      })
    },
    [payload, handleUpdate]
  )

  const handleChangeCollider = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      handleUpdate({ ...payload, collider: parseInt(value, 10) })
    },
    [payload, handleUpdate]
  )

  const renderPhysicsCollidersMoreInfo = useCallback(() => {
    return (
      <InfoTooltip
        text={'Use the Collider property to turn on or off physical or clickable interaction with this item.'}
      />
    )
  }, [])

  return (
    <Block className="SetVisibilityActionContainer">
      <Dropdown
        label="Select Visibility"
        options={[
          { value: 'true', label: 'Visible' },
          { value: 'false', label: 'Invisible' }
        ]}
        value={(payload.visible ?? true).toString()}
        onChange={handleSetVisible}
      />

      <Dropdown
        label={<>Collider {renderPhysicsCollidersMoreInfo()}</>}
        placeholder="Select Collider"
        options={COLLISION_LAYERS}
        value={payload.collider}
        onChange={handleChangeCollider}
      />
    </Block>
  )
}

export default React.memo(SetVisibilityAction)
