import { useCallback, useState } from 'react'
import { BiCog, BiCheckboxChecked, BiCheckbox } from 'react-icons/bi'
import cx from 'classnames'

import { withSdk } from '../../../hoc/withSdk'
import { ToolbarButton } from '../ToolbarButton'
import { useOutsideClick } from '../../../hooks/useOutsideClick'

import './Preferences.css'
import { useAppSelector, useAppDispatch } from '../../../redux/hooks'
import { selectInspectorPreferences } from '../../../redux/app'
import { setInspectorPreferences } from '../../../redux/data-layer'

export const Preferences = withSdk(({ sdk }) => {
  const [showPanel, setShowPanel] = useState(false)
  const preferences = useAppSelector(selectInspectorPreferences)
  const dispatch = useAppDispatch()
  const togglePanel = useCallback(() => {
    setShowPanel(!showPanel)
  }, [showPanel])
  const handleClosePanel = useCallback(() => setShowPanel(false), [])
  const ref = useOutsideClick(handleClosePanel)

  const toggleFreeCameraInvertRotation = useCallback(() => {
    dispatch(
      setInspectorPreferences({
        freeCameraInvertRotation: !preferences?.freeCameraInvertRotation
      })
    )
    // TODO: this should be done by the saga but we dont have the sdk.editorCamera on the store
    sdk.editorCamera.setFreeCameraInvertRotation(!preferences?.freeCameraInvertRotation)
  }, [preferences?.freeCameraInvertRotation])

  const toggleAutosaveEnabled = useCallback(() => {
    dispatch(setInspectorPreferences({ autosaveEnabled: !preferences?.autosaveEnabled }))
  }, [preferences?.autosaveEnabled])

  const FreeCameraInvertRotationIcon = preferences?.freeCameraInvertRotation ? BiCheckboxChecked : BiCheckbox
  const AutosaveEnabledIcon = preferences?.autosaveEnabled ? BiCheckboxChecked : BiCheckbox

  return (
    <div className="Preferences" ref={ref}>
      <ToolbarButton className="preferences" onClick={togglePanel} title="Preferences">
        <BiCog />
      </ToolbarButton>
      <div className={cx('panel', { visible: showPanel })}>
        <div className="preference-row">
          <label>Invert camera rotation</label>
          <FreeCameraInvertRotationIcon className="icon" onClick={toggleFreeCameraInvertRotation} />
        </div>
        <div className="preference-row">
          <label>Enable autosave</label>
          <AutosaveEnabledIcon className="icon" onClick={toggleAutosaveEnabled} />
        </div>
      </div>
    </div>
  )
})

export default Preferences
