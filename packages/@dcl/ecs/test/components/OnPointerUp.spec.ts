import { Engine } from '../../src/engine'

describe('Generated OnPointerDown ProtoBuf', () => {
  it('should serialize/deserialize OnPointerDown', () => {
    const newEngine = Engine()
    const { OnPointerUp } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()
    OnPointerUp.create(newEngine.addEntity())
    const onPointerUp = OnPointerUp.create(entity, {
      identifier: '98352439-fdsfds',
      button: 'PRIMARY',
      hoverText: 'Tap to run',
      distance: 10,
      showFeedback: true
    })

    OnPointerUp.create(entityB, {
      identifier: 'fg98352439-fdsfds',
      button: 'D',
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
    const { OnPointerUp, OnPointerResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    OnPointerUp.create(newEngine.addEntity())

    // We create an onPointerDownEvent
    const onPointerUp = OnPointerUp.create(entity, {
      identifier: '98352439-fdsfds',
      button: 'PRIMARY',
      hoverText: 'Tap to run',
      distance: 10,
      showFeedback: true
    })

    // wait a tick to receive a response
    newEngine.update(1/30)

    // We receive an OnPointerResult
    const onPointerResult = OnPointerResult.create(entity, {
      identifier: '98352439-fdsfds',
      button: 'PRIMARY',
      point: { x: 1, y: 2, z: 3 },
      distance: 10,
      direction: { x: 1, y: 2, z: 3 },
      normal: { x: 1, y: 2, z: 3 },
      origin: { x: 1, y: 2, z: 3 },
      meshName: 'mesh'
    })

    expect(onPointerUp.identifier).toEqual(onPointerResult.identifier)
    expect(OnPointerResult.has(entity))
  })

})
