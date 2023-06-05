import { useCallback, useState } from 'react'
import { BiCameraMovie, BiCheckboxChecked, BiCheckbox } from 'react-icons/bi'
import cx from 'classnames'

import { withSdk } from '../../../hoc/withSdk'
import { ToolbarButton } from '../ToolbarButton'
import { useOutsideClick } from '../../../hooks/useOutsideClick'

import './Camera.css'

export const Camera = withSdk(({ sdk }) => {
  const [showPanel, setShowPanel] = useState(false)
  const [freeCameraInvertRotation, setFreeCameraInvertRotation] = useState(sdk.preferences.data.freeCameraInvertRotation)

  const handleTogglePanel = useCallback(() => {setShowPanel(!showPanel)}, [showPanel])
  const handleClosePanel = useCallback(() => setShowPanel(false), [])
  const ref = useOutsideClick(handleClosePanel)

  const handleToggleFreeCameraInvertRotation = useCallback(() => {
    sdk.editorCamera.setFreeCameraInvertRotation(!freeCameraInvertRotation)
    sdk.preferences.setFreeCameraInvertRotation(!freeCameraInvertRotation)
    setFreeCameraInvertRotation(!freeCameraInvertRotation)
  }, [freeCameraInvertRotation])

  const FreeCameraInvertRotationIcon = freeCameraInvertRotation ? BiCheckboxChecked : BiCheckbox

  return (
    <div className="Camera" ref={ref}>
      <ToolbarButton className="camera" onClick={handleTogglePanel}>
        <BiCameraMovie />
      </ToolbarButton>
      <div className={cx('panel', { visible: showPanel })}>
        <div className="axis">
            <label>Invert rotation</label>
            <FreeCameraInvertRotationIcon
              className="icon"
              onClick={handleToggleFreeCameraInvertRotation}
            />
        </div>
      </div>
    </div>
  )
})

export default Camera