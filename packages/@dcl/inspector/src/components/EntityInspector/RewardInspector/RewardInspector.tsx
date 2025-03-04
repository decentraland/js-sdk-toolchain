import React from 'react'
import { Entity } from '@dcl/ecs'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { Container } from '../../Container'
import { InfoTooltip } from '../../ui'
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
    <Container
      label="Rewards"
      rightContent={
        <InfoTooltip
          text="Rewards enables the campaign configuration for giveaways."
          link="https://docs.decentraland.org/creator/smart-items/#rewards"
          type="help"
        />
      }
    >
      <RewardsForm entity={entity} className="RewardInspector" />
    </Container>
  )
})

export default React.memo(RewardInspector)
