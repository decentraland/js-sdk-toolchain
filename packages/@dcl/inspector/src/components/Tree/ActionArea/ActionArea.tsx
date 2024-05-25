import React, { useCallback, useMemo } from 'react'
import { IoEyeOutline as VisibleIcon, IoEyeOffOutline as InvisibleIcon } from 'react-icons/io5'
import { MdOutlineLock as LockIcon, MdOutlineLockOpen as UnlockIcon } from 'react-icons/md'
import { Entity } from '@dcl/ecs'

import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { CAMERA, PLAYER, ROOT } from '../../../lib/sdk/tree'
import { InfoTooltip } from '../../ui'

import './ActionArea.css'
import { Event, analytics } from '../../../lib/logic/analytics'

type Props = {
  entity: Entity
}

const ActionArea: React.FC<WithSdkProps & Props> = ({ sdk, ...props }) => {
  const {
    components: { Lock, Hide }
  } = sdk
  const { entity } = props

  const isEntityLocked = useMemo(() => {
    return Lock.getOrNull(entity) !== null
  }, [entity, sdk])

  const isEntityHidden = useMemo(() => {
    return Hide.getOrNull(entity) !== null
  }, [entity, sdk])

  const lock = useCallback(
    (value: boolean) => {
      sdk.operations.lock(entity, value)
    },
    [entity, sdk]
  )

  const hide = useCallback(
    (value: boolean) => {
      sdk.operations.hide(entity, value)
    },
    [entity, sdk]
  )

  const handleToggleHideComponent = useCallback(() => {
    const value = !isEntityHidden
    hide(value)
    analytics.track(Event.HIDE, { value })
  }, [hide, isEntityHidden])

  const handleToggleLockComponent = useCallback(() => {
    const value = !isEntityLocked
    lock(value)
    analytics.track(Event.LOCK, { value })
  }, [lock, isEntityLocked])

  const toggleLockButton = useCallback(() => {
    return (
      <div className="action-button">
        {isEntityLocked ? (
          <LockIcon className="lock-icon" size={16} onClick={handleToggleLockComponent} />
        ) : (
          <UnlockIcon className="unlock-icon" size={16} onClick={handleToggleLockComponent} />
        )}
      </div>
    )
  }, [isEntityLocked, handleToggleLockComponent])

  const toggleVisibleButton = useCallback(() => {
    return (
      <div className="action-button">
        {isEntityHidden ? (
          <InvisibleIcon className="invisible-icon" size={16} onClick={handleToggleHideComponent} />
        ) : (
          <VisibleIcon className="visible-icon" size={16} onClick={handleToggleHideComponent} />
        )}
      </div>
    )
  }, [isEntityHidden, handleToggleHideComponent])

  const isRoot = entity === ROOT
  const isPlayer = entity === PLAYER
  const isCamera = entity === CAMERA
  const isEntity = !isPlayer && !isCamera && !isRoot

  const infoTooltip = useCallback(
    (text: string, learnMore?: string) => (
      <div className="action-button">
        <InfoTooltip
          text={
            <>
              {text}
              {learnMore ? (
                <>
                  &nbsp;
                  <a href={learnMore} target="_blank" rel="noopener">
                    Learn more
                  </a>
                </>
              ) : null}
            </>
          }
          type="info"
          position="right center"
        />
      </div>
    ),
    []
  )

  return (
    <div className="action-area">
      {isEntity && toggleLockButton()}
      {isEntity && toggleVisibleButton()}
      {isPlayer &&
        infoTooltip(
          'The player’s avatar. Nested items are fixed to the player’s position.',
          'https://docs.decentraland.org/creator/web-editor/#special-entities'
        )}
      {isCamera &&
        infoTooltip(
          'The player’s camera. Nested items remain fixed to the camera’s position.',
          'https://docs.decentraland.org/creator/web-editor/#special-entities'
        )}
      {isRoot &&
        infoTooltip(
          'The root entity. All items in the scene are children of this entity. Open it to adjust the scene settings.',
          'https://docs.decentraland.org/creator/development-guide/sdk7/scene-metadata/#metadata'
        )}
    </div>
  )
}

export default React.memo(withSdk(ActionArea))
