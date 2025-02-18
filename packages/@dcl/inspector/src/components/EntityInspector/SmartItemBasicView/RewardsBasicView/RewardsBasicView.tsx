import React from 'react'
import { Entity } from '@dcl/ecs'
import { withSdk } from '../../../../hoc/withSdk'
import { RewardsForm } from '../../../EntityInspector/RewardInspector/RewardsForm'

import './RewardsBasicView.css'

type Props = {
  entity: Entity
}

export const RewardsBasicView = withSdk<Props>(({ entity }) => {
  return <RewardsForm entity={entity} className="RewardsBasicViewInspector" />
})

export default React.memo(RewardsBasicView)
