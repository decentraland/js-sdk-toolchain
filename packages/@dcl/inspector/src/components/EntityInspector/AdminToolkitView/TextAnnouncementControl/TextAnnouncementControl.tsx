import React, { useCallback } from 'react'
import { Entity } from '@dcl/ecs'
import { withSdk } from '../../../../hoc/withSdk'
import { useComponentValue } from '../../../../hooks/sdk/useComponentValue'
import { CheckboxGroup, CheckboxField } from '../../../ui'
import './TextAnnouncementControl.css'

type Props = {
  entity: Entity
}

type TextAnnouncementControlData = {
  isEnabled: boolean
  playSoundOnEachAnnouncement: boolean
  showAuthorOnEachAnnouncement: boolean
}

const TextAnnouncementControl = withSdk<Props>(({ sdk, entity }) => {
  const { AdminTools } = sdk.components
  const [adminComponent, setAdminComponent] = useComponentValue(entity, AdminTools)

  const handleBooleanChange = useCallback(
    (field: keyof Omit<TextAnnouncementControlData, 'isEnabled'>) => (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!adminComponent) return
      setAdminComponent({
        ...adminComponent,
        textAnnouncementControl: {
          ...adminComponent.textAnnouncementControl,
          [field]: event.target.checked
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  if (!adminComponent) return null

  const { textAnnouncementControl } = adminComponent

  return (
    <div className="TextAnnouncementControl">
      <CheckboxGroup>
        <CheckboxField
          label="Show author on each announcements"
          checked={textAnnouncementControl.showAuthorOnEachAnnouncement || false}
          onChange={handleBooleanChange('showAuthorOnEachAnnouncement')}
        />
      </CheckboxGroup>
    </div>
  )
})

export default React.memo(TextAnnouncementControl)
