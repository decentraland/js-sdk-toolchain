import React, { useState, useEffect } from 'react'
import './CameraSpeed.css'
import { withSdk } from '../../../hoc/withSdk'
import classNames from 'classnames'

const CameraSpeed = withSdk(({ sdk }) => {
  const [speed, setSpeed] = useState<number>(sdk.editorCamera.getSpeed())
  const [visible, setVisible] = useState<boolean>(false)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null

    const onSpeedChange = (newSpeed: number) => {
      setSpeed(newSpeed)
      setVisible(true)
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      timeoutId = setTimeout(() => setVisible(false), 1000)
    }
    sdk.editorCamera.getSpeedChangeObservable().on('change', onSpeedChange)

    return () => {
      sdk.editorCamera.getSpeedChangeObservable().off('change', onSpeedChange)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [sdk])

  return (
    <div className={classNames('CameraSpeed', { visible: visible, invisible: !visible })}>
      Camera speed: {speed.toFixed(1)} m/s
    </div>
  )
})

export default CameraSpeed
