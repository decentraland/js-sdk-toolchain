import React from 'react'
import { Entity } from '@dcl/ecs'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { Container } from '../../Container'
import RewardsForm from './RewardsForm'

type Props = {
  entity: Entity
}

export const RewardInspector = withSdk<Props>(({ sdk, entity }) => {
  const { Rewards } = sdk.components

  const hasRewards = useHasComponent(entity, Rewards)

  if (!hasRewards) {
    return null
  }

  return (
    <Container label="Rewards">
      <RewardsForm entity={entity} className="RewardInspector" />
    </Container>
  )
})

export default React.memo(RewardInspector)
