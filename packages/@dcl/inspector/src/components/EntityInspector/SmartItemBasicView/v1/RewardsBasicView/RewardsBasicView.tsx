import React from 'react'
import { Entity } from '@dcl/ecs'
import { withSdk } from '../../../../../hoc/withSdk'
import { useHasComponent } from '../../../../../hooks/sdk/useHasComponent'
import { RewardsForm } from '../../../RewardInspector/RewardsForm'

import './RewardsBasicView.css'

type Props = {
  entity: Entity
}

export const RewardsBasicView = withSdk<Props>(({ sdk, entity }) => {
  const { Rewards } = sdk.components

  const hasRewards = useHasComponent(entity, Rewards)

  if (!hasRewards) {
    return null
  }

  return <RewardsForm entity={entity} className="RewardsBasicViewInspector" />
})

export default React.memo(RewardsBasicView)
