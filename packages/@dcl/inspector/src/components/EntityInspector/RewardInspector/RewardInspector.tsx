import React, { useCallback } from 'react'
import { Entity } from '@dcl/ecs'
import { FiExternalLink as ExternalLinkIcon } from 'react-icons/fi'
import { withSdk } from '../../../hoc/withSdk'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { Container } from '../../Container'
import { CheckboxField, TextArea, TextField } from '../../ui'
import { Button } from '../../Button'
import './RewardInspector.css'

type Props = {
  entity: Entity
}

export const RewardInspector = withSdk<Props>(({ sdk, entity }) => {
  const { Rewards } = sdk.components
  const [rewardsComponent, setRewardsComponent] = useComponentValue(entity, Rewards)
  const [showKey, setShowKey] = React.useState(false)

  const handleTestModeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!rewardsComponent) return
      setRewardsComponent({
        ...rewardsComponent,
        testMode: event.target.checked
      })
    },
    [rewardsComponent, setRewardsComponent]
  )

  const handleCampaignIdChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      console.log('handleCampaignIdChange', event.target.value, !rewardsComponent)
      if (!rewardsComponent) return
      setRewardsComponent({
        ...rewardsComponent,
        campaignId: event.target.value
      })
    },
    [rewardsComponent, setRewardsComponent]
  )

  const handleDispenserKeyChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!rewardsComponent) return
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

  if (!rewardsComponent) return null

  return (
    <Container label="Rewards">
      <div className="RewardInspector">
        <CheckboxField label="Test Mode" checked={rewardsComponent.testMode} onChange={handleTestModeChange} />

        <div className="field-with-link">
          <TextField label="Campaign ID" value={rewardsComponent.campaignId} onChange={handleCampaignIdChange} />
          <Button
            className="text link"
            onClick={() =>
              window.open(`https://decentraland.zone/rewards/campaign/?id=${rewardsComponent.campaignId}`, '_blank')
            }
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
          <Button
            className="text link"
            onClick={() => window.open('https://rewards.decentraland.org/dispensers', '_blank')}
          >
            <ExternalLinkIcon /> Edit dispenser
          </Button>
        </div>
      </div>
    </Container>
  )
})

export default React.memo(RewardInspector)
