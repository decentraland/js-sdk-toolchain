import React, { useCallback, useMemo } from 'react'
import { Entity } from '@dcl/ecs'
import { Action } from '@dcl/asset-packs'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { withSdk, WithSdkProps } from '../../../../hoc/withSdk'
import { getComponentValue, useComponentValue } from '../../../../hooks/sdk/useComponentValue'
import { useEntitiesWith } from '../../../../hooks/sdk/useEntitiesWith'

import { CheckboxField, CheckboxGroup, TextField, Dropdown, EntityField } from '../../../ui'
import { Button } from '../../../Button'
import { AddButton } from '../../AddButton'
import MoreOptionsMenu from '../../MoreOptionsMenu'
import { Component } from '../../../../lib/sdk/components'
import { Block } from '../../../Block'

import './SmartItemControl.css'

type Props = {
  entity: Entity
}

const SmartItemControl: React.FC<WithSdkProps & Props> = ({ sdk, entity }) => {
  const { AdminTools, Actions } = sdk.components
  const [adminComponent, setAdminComponent] = useComponentValue(entity, AdminTools)
  const entitiesWithAction: Entity[] = useEntitiesWith((components) => components.Actions)

  const handleAddSmartItemAction = useCallback(() => {
    if (!adminComponent) return

    setAdminComponent({
      ...adminComponent,
      smartItemsControl: {
        ...adminComponent.smartItemsControl,
        smartItems: [
          ...(adminComponent.smartItemsControl.smartItems || []),
          { entity: 0, defaultAction: '', customName: '' }
        ]
      }
    })
  }, [adminComponent, setAdminComponent])

  const handleRemoveSmartItemAction = useCallback(
    (_: React.MouseEvent, idx: number) => {
      if (!adminComponent) return
      const updatedSmartItems = adminComponent.smartItemsControl.smartItems?.filter((_, index) => index !== idx) || []

      setAdminComponent({
        ...adminComponent,
        smartItemsControl: {
          ...adminComponent.smartItemsControl,
          smartItems: updatedSmartItems
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleChangeSmartItemActionsEntity = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      if (!adminComponent) return
      const updatedSmartItems =
        adminComponent.smartItemsControl.smartItems?.map((item, index) =>
          index === idx ? { ...item, entity: Number(e.target.value) } : item
        ) || []

      setAdminComponent({
        ...adminComponent,
        smartItemsControl: {
          ...adminComponent.smartItemsControl,
          smartItems: updatedSmartItems
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleChangeSmartItemActionsAction = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      if (!adminComponent) return
      const updatedSmartItems =
        adminComponent.smartItemsControl.smartItems?.map((item, index) =>
          index === idx ? { ...item, defaultAction: e.target.value } : item
        ) || []

      setAdminComponent({
        ...adminComponent,
        smartItemsControl: {
          ...adminComponent.smartItemsControl,
          smartItems: updatedSmartItems
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleChangeSmartItemActionsCustomName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
      if (!adminComponent) return
      const updatedSmartItems =
        adminComponent.smartItemsControl.smartItems?.map((item, index) =>
          index === idx ? { ...item, customName: e.target.value } : item
        ) || []
      setAdminComponent({
        ...adminComponent,
        smartItemsControl: { ...adminComponent.smartItemsControl, smartItems: updatedSmartItems }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleBooleanChange = useCallback(
    (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!adminComponent) return
      setAdminComponent({
        ...adminComponent,
        smartItemsControl: {
          ...adminComponent.smartItemsControl,
          [field]: event.target.checked
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const availableActions: Map<number, { actions: Action[] }> = useMemo(() => {
    return entitiesWithAction?.reduce((actions, entityWithAction) => {
      const actionsComponentValue = getComponentValue(entityWithAction, Actions)
      if (actionsComponentValue.value.length > 0) {
        actions.set(entityWithAction, { actions: actionsComponentValue.value as Action[] })
      }
      return actions
    }, new Map<number, { actions: Action[] }>())
  }, [entitiesWithAction])

  if (!adminComponent) return null

  return (
    <div className="SmartItemControl">
      <CheckboxGroup>
        <CheckboxField
          label="Link All Smart Items"
          checked={adminComponent.smartItemsControl.linkAllSmartItems || false}
          onChange={handleBooleanChange('linkAllSmartItems')}
        />
      </CheckboxGroup>

      {adminComponent.smartItemsControl.smartItems?.map((smartItem, idx) => {
        const actions = smartItem.entity
          ? (availableActions.get(smartItem.entity)?.actions ?? []).map(({ name }) => ({
              value: name,
              label: name
            }))
          : []

        return (
          <Block key={smartItem.entity} className="SmartItemRow">
            <div className="LeftColumn">
              <span>{idx + 1}</span>
            </div>
            <div className="FieldsContainer">
              <EntityField
                label="Smart Item"
                components={[sdk.components.Actions] as Component[]}
                value={smartItem.entity}
                onChange={(e) => handleChangeSmartItemActionsEntity(e, idx)}
              />
              <TextField
                label="Custom Name"
                value={smartItem.customName}
                onChange={(e) => handleChangeSmartItemActionsCustomName(e, idx)}
              />
              <Dropdown
                label="Default Action"
                placeholder="Default Action"
                disabled={!smartItem.entity}
                options={actions}
                value={smartItem.defaultAction}
                onChange={(e) => handleChangeSmartItemActionsAction(e, idx)}
              />
            </div>
            <div className="RightMenu">
              <MoreOptionsMenu>
                <Button className="RemoveButton" onClick={(e) => handleRemoveSmartItemAction(e, idx)}>
                  <RemoveIcon /> Remove
                </Button>
              </MoreOptionsMenu>
            </div>
          </Block>
        )
      })}
      <AddButton onClick={handleAddSmartItemAction}>Add Smart Item</AddButton>
    </div>
  )
}

export default React.memo(withSdk(SmartItemControl))
