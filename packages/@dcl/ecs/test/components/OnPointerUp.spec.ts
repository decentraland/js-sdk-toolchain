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
})
