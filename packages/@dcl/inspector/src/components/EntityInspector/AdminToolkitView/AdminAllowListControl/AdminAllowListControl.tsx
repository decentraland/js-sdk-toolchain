import React, { useCallback, useState } from 'react'
import { AiOutlineInfoCircle as InfoIcon } from 'react-icons/ai'
import { Entity } from '@dcl/ecs'
import { AdminPermissions } from '@dcl/asset-packs'

import { withSdk } from '../../../../hoc/withSdk'
import { useComponentValue } from '../../../../hooks/sdk/useComponentValue'

import { TextField, Pill, Dropdown, CheckboxGroup, CheckboxField } from '../../../ui'
import { AddButton } from '../../AddButton'
import './AdminAllowListControl.css'

type Props = {
  entity: Entity
}

const AdminAllowListControl = withSdk<Props>(({ sdk, entity }) => {
  const { AdminTools } = sdk.components
  const [adminComponent, setAdminComponent] = useComponentValue(entity, AdminTools)
  const [newWallet, setNewWallet] = useState('')

  const handleAdminPermissionChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (!adminComponent) return
      setAdminComponent({
        ...adminComponent,
        adminPermissions: event.target.value as AdminPermissions
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleAuthorizedUserChange = useCallback(
    (field: keyof typeof adminComponent.authorizedAdminUsers) => (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!adminComponent) return
      setAdminComponent({
        ...adminComponent,
        authorizedAdminUsers: {
          ...adminComponent.authorizedAdminUsers,
          [field]: event.target.checked
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleWalletInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setNewWallet(event.target.value)
  }, [])

  const handleAddWallet = useCallback(() => {
    if (!adminComponent || !newWallet.trim()) return

    setAdminComponent({
      ...adminComponent,
      authorizedAdminUsers: {
        ...adminComponent.authorizedAdminUsers,
        adminAllowList: [...adminComponent.authorizedAdminUsers.adminAllowList, newWallet.trim()]
      }
    })
    setNewWallet('')
  }, [adminComponent, setAdminComponent, newWallet])

  const handleRemoveWallet = useCallback(
    (wallet: string) => {
      if (!adminComponent) return
      setAdminComponent({
        ...adminComponent,
        authorizedAdminUsers: {
          ...adminComponent.authorizedAdminUsers,
          adminAllowList: adminComponent.authorizedAdminUsers.adminAllowList.filter((w) => w !== wallet)
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const renderDefaultAdminPermissionsInfoMessage = useCallback(
    () => (
      <>
        <InfoIcon size="10" />
        {adminComponent.adminPermissions === AdminPermissions.PUBLIC
          ? 'All scene visitors will have access to the Scene Tools panel.'
          : 'Admin permissions are restricted to authorized users only.'}
      </>
    ),
    [adminComponent.adminPermissions]
  )

  if (!adminComponent) return null

  const showAllowList =
    adminComponent.adminPermissions === AdminPermissions.PRIVATE && adminComponent.authorizedAdminUsers.allowList

  return (
    <div className="DefaultAdminPermissionsContainer">
      <div className="DefaultAdminPermissions">
        <Dropdown
          className="DefaultAdminPermissionsDropdown"
          label="Default Admin Permissions"
          value={adminComponent.adminPermissions || AdminPermissions.PUBLIC}
          onChange={handleAdminPermissionChange}
          options={[
            { value: AdminPermissions.PUBLIC, label: 'Public' },
            { value: AdminPermissions.PRIVATE, label: 'Private' }
          ]}
          info={renderDefaultAdminPermissionsInfoMessage()}
        />
        {adminComponent.adminPermissions === AdminPermissions.PRIVATE ? (
          <CheckboxGroup label="Authorized users" className="AuthorizedUsersCheckboxGroup">
            <CheckboxField label="Me" checked={adminComponent.authorizedAdminUsers.me} disabled />
            <CheckboxField
              label="Scene Owners"
              checked={adminComponent.authorizedAdminUsers.sceneOwners}
              onChange={handleAuthorizedUserChange('sceneOwners')}
            />
            <CheckboxField
              label="Allow List"
              checked={adminComponent.authorizedAdminUsers.allowList}
              onChange={handleAuthorizedUserChange('allowList')}
            />
          </CheckboxGroup>
        ) : null}
      </div>
      {showAllowList ? (
        <div className="AdminAllowListContainer">
          <div className="AdminAllowListActions">
            <TextField label="Admin Allow List" value={newWallet} onChange={handleWalletInputChange} />
            <AddButton onClick={handleAddWallet}>Add</AddButton>
          </div>
          {adminComponent.authorizedAdminUsers.adminAllowList.length > 0 ? (
            <div className="AdminAllowList">
              {adminComponent.authorizedAdminUsers.adminAllowList.map((wallet) => (
                <Pill key={wallet} content={wallet} onRemove={() => handleRemoveWallet(wallet)} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
})

export default React.memo(AdminAllowListControl)
