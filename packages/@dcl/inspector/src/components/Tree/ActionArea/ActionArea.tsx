import React, { useCallback, useMemo } from 'react'
import { IoEyeOutline as VisibleIcon, IoEyeOffOutline as InvisibleIcon } from 'react-icons/io5'
import { MdOutlineLock as LockIcon, MdOutlineLockOpen as UnlockIcon } from 'react-icons/md'
import { Entity, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'

import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { useEntityComponent } from '../../../hooks/sdk/useEntityComponent'
import { SdkContextValue } from '../../../lib/sdk/context'
import './ActionArea.css'

type Props = {
  entity: Entity
}

const ActionArea: React.FC<WithSdkProps & Props> = ({ sdk, ...props }) => {
  const {
    components: { Lock, Hide }
  } = sdk
  const { entity } = props
  const { addComponent, removeComponent } = useEntityComponent()

  const isEntityLocked = useMemo(() => {
    return Lock.getOrNull(entity) !== null
  }, [entity, sdk])

  const isEntityHidden = useMemo(() => {
    return Hide.getOrNull(entity) !== null
  }, [entity, sdk])

  const handleToggleHideComponent = useCallback(() => {
    if (isEntityHidden) {
      removeComponent(
        entity,
        Hide as unknown as LastWriteWinElementSetComponentDefinition<SdkContextValue['components']>
      )
    } else {
      addComponent(entity, Hide.componentId, { value: true })
    }
  }, [entity, sdk, isEntityHidden])

  const handleToggleLockComponent = useCallback(() => {
    if (isEntityLocked) {
      removeComponent(
        entity,
        Lock as unknown as LastWriteWinElementSetComponentDefinition<SdkContextValue['components']>
      )
    } else {
      addComponent(entity, Lock.componentId, { value: true })
    }
  }, [sdk, isEntityLocked])

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

  return (
    <div className="action-area">
      {toggleLockButton()}
      {toggleVisibleButton()}
    </div>
  )
}

export default React.memo(withSdk(ActionArea))
