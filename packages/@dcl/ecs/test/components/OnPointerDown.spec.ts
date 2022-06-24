import { Engine } from '../../src/engine'

describe('Generated OnPointerDown ProtoBuf', () => {
  it('should serialize/deserialize OnPointerDown', () => {
    const newEngine = Engine()
    const { OnPointerDown } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()
    OnPointerDown.create(newEngine.addEntity())
    const onPointerDown = OnPointerDown.create(entity, {
      identifier: '98352439-fdsfds',
      button: 'PRIMARY',
      hoverText: 'Tap to run',
      distance: 10,
      showFeedback: true
    })

    OnPointerDown.create(entityB, {
      identifier: 'fg98352439-fdsfds',
      button: 'D',
      hoverText: 'TCker',
      distance: 5,
      showFeedback: false
    })
    const buffer = OnPointerDown.toBinary(entity)
    OnPointerDown.updateFromBinary(entityB, buffer)

    expect(onPointerDown).toEqual({ ...OnPointerDown.mutable(entityB) })
  })

  it('should receive OnPointerResult', () => {
    const newEngine = Engine()
    const { OnPointerDown, OnPointerResult } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    OnPointerDown.create(newEngine.addEntity())

    // We create an onPointerDownEvent
    const onPointerDown = OnPointerDown.create(entity, {
      identifier: '98352439-fdsfds',
      button: 'PRIMARY',
      hoverText: 'Tap to run',
      distance: 10,
      showFeedback: true
    })

    // wait a tick to receive a response
    newEngine.update(1 / 30)

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

    expect(onPointerDown.identifier).toEqual(onPointerResult.identifier)
    expect(OnPointerResult.has(entity))
  })
})
