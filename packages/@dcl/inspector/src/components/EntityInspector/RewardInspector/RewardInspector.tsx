import React from 'react'
import { Entity } from '@dcl/ecs'

import { withSdk } from '../../../hoc/withSdk'
import { Container } from '../../Container'
import RewardsForm from './RewardsForm'

type Props = {
  entity: Entity
}

export const RewardInspector = withSdk<Props>(({ entity }) => {
  return (
    <Container label="Rewards">
      <RewardsForm entity={entity} className="RewardInspector" />
    </Container>
  )
})

export default React.memo(RewardInspector)
