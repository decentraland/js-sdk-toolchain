import React, { useCallback } from 'react'
import { Entity } from '@dcl/ecs'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'

import { withSdk, WithSdkProps } from '../../../../hoc/withSdk'
import { useComponentValue } from '../../../../hooks/sdk/useComponentValue'
import { useComponentsWith } from '../../../../hooks/sdk/useComponentsWith'

import { Dropdown, TextField } from '../../../ui'
import { Block } from '../../../Block'
import { Button } from '../../../Button'
import { AddButton } from '../../AddButton'
import MoreOptionsMenu from '../../MoreOptionsMenu'

import './RewardsControl.css'

type Props = {
  entity: Entity
}

const RewardsControl: React.FC<WithSdkProps & Props> = ({ sdk, ...props }) => {
  const { AdminTools, Name } = sdk.components
  const { entity } = props
  const [adminComponent, setAdminComponent] = useComponentValue(entity, AdminTools)
  const [rewardsComponentEntities] = useComponentsWith((components) => components.Rewards)

  const handleAddRewardItem = useCallback(() => {
    setAdminComponent({
      ...adminComponent,
      rewardsControl: {
        ...adminComponent.rewardsControl,
        rewardItems: [...(adminComponent.rewardsControl.rewardItems || []), { entity: 0, customName: '' }]
      }
    })
  }, [adminComponent, setAdminComponent])

  const handleRemoveRewardItem = useCallback(
    (idx: number) => {
      const updatedRewardItems = adminComponent.rewardsControl.rewardItems?.filter((_, index) => index !== idx)

      setAdminComponent({
        ...adminComponent,
        rewardsControl: {
          ...adminComponent.rewardsControl,
          rewardItems: updatedRewardItems
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleRewardItemChange = useCallback(
    (idx: number, e: React.ChangeEvent<HTMLSelectElement>) => {
      const updatedRewardItems = adminComponent.rewardsControl.rewardItems?.map((rewardItem, index) =>
        index === idx ? { ...rewardItem, entity: Number(e.target.value) } : rewardItem
      )
      setAdminComponent({
        ...adminComponent,
        rewardsControl: {
          ...adminComponent.rewardsControl,
          rewardItems: updatedRewardItems
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleRewardItemNameChange = useCallback(
    (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const updatedRewardItems = adminComponent.rewardsControl.rewardItems?.map((rewardItem, index) =>
        index === idx ? { ...rewardItem, customName: e.target.value } : rewardItem
      )
      setAdminComponent({
        ...adminComponent,
        rewardsControl: {
          ...adminComponent.rewardsControl,
          rewardItems: updatedRewardItems
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const getRewardsItems = useCallback(() => {
    const selectedEntities = new Set(
      adminComponent?.rewardsControl.rewardItems?.map((rewardItem) => rewardItem.entity) || []
    )

    return rewardsComponentEntities.map((rewardItem) => ({
      value: rewardItem.entity,
      label: Name.getOrNull(rewardItem.entity)?.value || `Reward Item ${rewardItem.entity}`,
      disabled: rewardItem.entity !== 0 && selectedEntities.has(rewardItem.entity) // Allow 0 as it's the default unselected value
    }))
  }, [rewardsComponentEntities, adminComponent?.rewardsControl.rewardItems, Name])

  return (
    <div className="RewardsControl">
      {adminComponent.rewardsControl.rewardItems?.map((rewardItem, idx) => {
        const options = getRewardsItems().map((option) => ({
          ...option,
          disabled: option.disabled && option.value !== rewardItem.entity // Keep current selection enabled
        }))

        return (
          <Block key={rewardItem.entity} className="RewardItemRow">
            <div className="LeftColumn">
              <span>{idx + 1}</span>
            </div>
            <div className="FieldsContainer">
              <Dropdown
                label="Airdrop type"
                value={rewardItem.entity}
                options={options}
                onChange={(e) => handleRewardItemChange(idx, e)}
              />
              <TextField
                label="Custom Name"
                value={rewardItem.customName}
                onChange={(e) => handleRewardItemNameChange(idx, e)}
              />
            </div>
            <div className="RightMenu">
              <MoreOptionsMenu>
                <Button className="RemoveButton" onClick={() => handleRemoveRewardItem(idx)}>
                  <RemoveIcon /> Remove
                </Button>
              </MoreOptionsMenu>
            </div>
          </Block>
        )
      })}
      <AddButton onClick={handleAddRewardItem}>Add a new Airdrop</AddButton>
    </div>
  )
}

export default React.memo(withSdk(RewardsControl))
