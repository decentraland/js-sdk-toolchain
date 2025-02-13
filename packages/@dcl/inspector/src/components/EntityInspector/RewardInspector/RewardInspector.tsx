import React, { useCallback } from 'react'
import { Entity } from '@dcl/ecs'
import { FiExternalLink as ExternalLinkIcon } from 'react-icons/fi'

import { withSdk } from '../../../hoc/withSdk'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'

import { Container } from '../../Container'
import { Button } from '../../Button'
import { CheckboxField, TextArea, TextField } from '../../ui'
import './RewardInspector.css'

const REWARDS_URL = 'https://rewards.decentraland.zone/rewards'

type Props = {
  entity: Entity
}

export const RewardInspector = withSdk<Props>(({ sdk, entity }) => {
  const { Rewards } = sdk.components
  const [rewardsComponent, setRewardsComponent] = useComponentValue(entity, Rewards)
  const [showKey, setShowKey] = React.useState(false)

  const hasRewards = useHasComponent(entity, Rewards)

  const handleTestModeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRewardsComponent({
        ...rewardsComponent,
        testMode: event.target.checked
      })
    },
    [rewardsComponent, setRewardsComponent]
  )

  const handleCampaignIdChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRewardsComponent({
        ...rewardsComponent,
        campaignId: event.target.value
      })
    },
    [rewardsComponent, setRewardsComponent]
  )

  const handleDispenserKeyChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setRewardsComponent({
        ...rewardsComponent,
        dispenserKey: event.target.value
      })
    },
    [rewardsComponent, setRewardsComponent]
  )

  const toggleShowKey = useCallback(() => {
    setShowKey(!showKey)
  }, [showKey])

  if (!hasRewards) return null

  return (
    <Container label="Rewards">
      <div className="RewardInspector">
        <CheckboxField label="Test Mode" checked={rewardsComponent.testMode} onChange={handleTestModeChange} />

        <div className="field-with-link">
          <TextField label="Campaign ID" value={rewardsComponent.campaignId} onChange={handleCampaignIdChange} />
          <Button
            className="text link"
            onClick={() => window.open(`${REWARDS_URL}/campaign/?id=${rewardsComponent.campaignId}`, '_blank')}
          >
            <ExternalLinkIcon /> Campaign overview
          </Button>
        </div>

        <div className="field-with-link">
          <div className="masked-field">
            <TextArea
              label="Dispenser Key"
              value={rewardsComponent.dispenserKey}
              onChange={handleDispenserKeyChange}
              showValue={showKey}
              masked
            />
            <Button className="text" onClick={toggleShowKey}>
              {showKey ? 'Hide' : 'Show'}
            </Button>
          </div>
          <Button className="text link" onClick={() => window.open(`${REWARDS_URL}/dispensers`, '_blank')}>
            <ExternalLinkIcon /> Edit dispenser
          </Button>
        </div>
      </div>
    </Container>
  )
})

export default React.memo(RewardInspector)
