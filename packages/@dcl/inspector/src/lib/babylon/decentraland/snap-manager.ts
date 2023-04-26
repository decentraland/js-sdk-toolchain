import mitt from 'mitt'

const getSnapManager = () => {
  let positionSnap = 0.25
  let rotationSnap = 15 * (Math.PI / 180)
  let scaleSnap = 0.1
  let enabled = true
  const events = mitt<{ change: void }>()

  function getPositionSnap() {
    return positionSnap
  }

  function setPositionSnap(value: number) {
    positionSnap = value * (Math.PI / 180)
    events.emit('change')
  }

  function getRotationSnap() {
    return rotationSnap
  }

  function setRotationSnap(value: number) {
    rotationSnap = value
    events.emit('change')
  }

  function getScaleSnap() {
    return scaleSnap
  }

  function setScaleSnap(value: number) {
    scaleSnap = value
    events.emit('change')
  }

  function isEnabled() {
    return enabled
  }

  function setEnabled(value: boolean) {
    enabled = value
    events.emit('change')
  }

  function onChange(
    cb: (values: { positionSnap: number; rotationSnap: number; scaleSnap: number; enabled: boolean }) => void
  ) {
    const handler = () => cb({ positionSnap, rotationSnap, scaleSnap, enabled })
    events.on('change', handler)
    return () => events.off('change', handler)
  }

  return {
    getPositionSnap,
    setPositionSnap,
    getRotationSnap,
    setRotationSnap,
    getScaleSnap,
    setScaleSnap,
    isEnabled,
    setEnabled,
    onChange
  }
}

export const snapManager = getSnapManager()
