import { useCallback, useState } from 'react'
import { BiCog, BiCheckboxChecked, BiCheckbox } from 'react-icons/bi'
import cx from 'classnames'

import { withSdk } from '../../../hoc/withSdk'
import { ToolbarButton } from '../ToolbarButton'
import { useOutsideClick } from '../../../hooks/useOutsideClick'

import './Preferences.css'

export const Preferences = withSdk(({ sdk }) => {
  const [showPanel, setShowPanel] = useState(false)
  const [freeCameraInvertRotation, setFreeCameraInvertRotation] = useState(
    sdk.preferences.data.freeCameraInvertRotation
  )
  const [autosaveEnabled, setAutosaveEnabled] = useState(sdk.preferences.data.autosaveEnabled)

  const togglePanel = useCallback(() => {
    setShowPanel(!showPanel)
  }, [showPanel])
  const handleClosePanel = useCallback(() => setShowPanel(false), [])
  const ref = useOutsideClick(handleClosePanel)

  const toggleFreeCameraInvertRotation = useCallback(() => {
    sdk.editorCamera.setFreeCameraInvertRotation(!freeCameraInvertRotation)
    sdk.preferences.setFreeCameraInvertRotation(!freeCameraInvertRotation)
    setFreeCameraInvertRotation(!freeCameraInvertRotation)
  }, [freeCameraInvertRotation])

  const toggleAutosaveEnabled = useCallback(() => {
    sdk.preferences.setAutosaveEnabled(!autosaveEnabled)
    setAutosaveEnabled(!autosaveEnabled)
  }, [autosaveEnabled])

  const FreeCameraInvertRotationIcon = freeCameraInvertRotation ? BiCheckboxChecked : BiCheckbox
  const AutosaveEnabledIcon = autosaveEnabled ? BiCheckboxChecked : BiCheckbox

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
