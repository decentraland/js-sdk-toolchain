import React, { useCallback, useEffect, useState } from 'react'
import { BiCameraMovie, BiCheckboxChecked, BiCheckbox } from 'react-icons/bi'
import cx from 'classnames'

import { withSdk } from '../../../hoc/withSdk'
import { ToolbarButton } from '../ToolbarButton'
import { useOutsideClick } from '../../../hooks/useOutsideClick'

import './Camera.css'

export const Camera = withSdk(({ sdk }) => {
  const [showPanel, setShowPanel] = useState(false)
  const [invertXAxis, setInvertXAxis] = useState(sdk.editorCamera.getInvertXAxis())
  const [invertYAxis, setInvertYAxis] = useState(sdk.editorCamera.getInvertYAxis())

  const handleTogglePanel = useCallback(() => {setShowPanel(!showPanel)}, [showPanel])
  const handleClosePanel = useCallback(() => setShowPanel(false), [])
  const ref = useOutsideClick(handleClosePanel)

  const handleToggleInvertXAxis = useCallback(() => {
    sdk.editorCamera.setInvertXAxis(!invertXAxis)
    setInvertXAxis(!invertXAxis)
  }, [invertXAxis])

  const handleToggleInvertYAxis = useCallback(() => {
    sdk.editorCamera.setInvertYAxis(!invertYAxis)
    setInvertYAxis(!invertYAxis)
  }, [invertYAxis])

  const InvertXAxisIcon = invertXAxis ? BiCheckboxChecked : BiCheckbox
  const InvertYAxisIcon = invertYAxis ? BiCheckboxChecked : BiCheckbox

  return (
    <div className="Camera" ref={ref}>
      <ToolbarButton onClick={handleTogglePanel}>
        <BiCameraMovie />
      </ToolbarButton>
      <div className={cx('panel', { visible: showPanel })}>
        <div className="axis">
            <label>Invert X axis</label>
            <InvertXAxisIcon
              className="icon"
              onClick={handleToggleInvertXAxis}
            />
        </div>
        <div className="axis">
            <label>Invert Y axis</label>
            <InvertYAxisIcon
              className="icon"
              onClick={handleToggleInvertYAxis}
            />
        </div>
      </div>
    </div>
  )
})

export default Camera