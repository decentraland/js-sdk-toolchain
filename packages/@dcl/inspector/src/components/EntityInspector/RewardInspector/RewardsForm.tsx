import React, { useCallback } from 'react'
import { Entity } from '@dcl/ecs'
import { FiExternalLink as ExternalLinkIcon } from 'react-icons/fi'

import { withSdk } from '../../../hoc/withSdk'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'

import { Button } from '../../Button'
import { CheckboxField, TextArea, TextField } from '../../ui'

import './RewardsForm.css'

const REWARDS_URL = 'https://decentraland.zone/rewards'

type Props = {
  entity: Entity
  className?: string
}

export const RewardsForm = withSdk<Props>(({ sdk, entity, className = '' }) => {
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

  if (!hasRewards || !rewardsComponent) return null

  return (
    <div className={`RewardsForm ${className}`}>
      <CheckboxField label="Test Mode" checked={rewardsComponent.testMode} onChange={handleTestModeChange} />

      <div className="field-with-link">
        <TextField label="Campaign ID" value={rewardsComponent.campaignId} onChange={handleCampaignIdChange} />
        <Button
          className="text link"
          onClick={() => window.open(`${REWARDS_URL}/campaign/?id=${rewardsComponent.campaignId}`, '_blank')}
          disabled={!rewardsComponent.campaignId}
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
      </div>
    </div>
  )
})

export default React.memo(RewardsForm)
