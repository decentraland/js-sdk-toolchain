import { Engine } from '../../src/engine'

describe('Generated OnPointerDown ProtoBuf', () => {
  it('should serialize/deserialize OnPointerUp', () => {
    const newEngine = Engine()
    const { OnPointerUp } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()
    OnPointerUp.create(newEngine.addEntity())
    const onPointerUp = OnPointerUp.create(entity, {
      button: 1,
      hoverText: 'Tap to run',
      distance: 10,
      showFeedback: true
    })

    OnPointerUp.create(entityB, {
      button: 3,
      hoverText: 'TCker',
      distance: 5,
      showFeedback: false
    })
    const buffer = OnPointerUp.toBinary(entity)
    OnPointerUp.updateFromBinary(entityB, buffer)

    expect(onPointerUp).toBeDeepCloseTo({ ...OnPointerUp.mutable(entityB) })
  })

  it('should receive OnPointerResult', () => {
    const newEngine = Engine()
    const { OnPointerUp, OnPointerUpResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    OnPointerUp.create(newEngine.addEntity())

    // We create an onPointerDownEvent
    OnPointerUp.create(entity, {
      button: 1,
      hoverText: 'Tap to run',
      distance: 10,
      showFeedback: true
    })

    // wait a tick to receive a response
    newEngine.update(1 / 30)

    // We receive an OnPointerResult
    OnPointerUpResult.create(entity, {
      timestamp: 1,
      button: 3,
      point: { x: 1, y: 2, z: 3 },
      distance: 10,
      direction: { x: 1, y: 2, z: 3 },
      normal: { x: 1, y: 2, z: 3 },
      origin: { x: 1, y: 2, z: 3 },
      meshName: 'mesh'
    })

    expect(OnPointerUpResult.has(entity))
  })
})
