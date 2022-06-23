import { Engine } from '../../src/engine'

describe('Generated OnPointerDown ProtoBuf', () => {


  it('should serialize/deserialize OnPointerDown', () => {
    const newEngine = Engine()
    const { OnPointerDown } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const onPointerDown = OnPointerDown.create(entity, {
      identifier: "98352439-fdsfds",
      button: "PRIMARY",
      hoverText: "Tap to run",
      distance: 10,
      showFeedback: true,
    })

    OnPointerDown.create(entityB, {
      identifier: "fg98352439-fdsfds",
      button: "D",
      hoverText: "TCker",
      distance: 5,
      showFeedback: false,
    })
    const buffer = OnPointerDown.toBinary(entity)
    OnPointerDown.updateFromBinary(entityB, buffer)

    expect(onPointerDown).toEqual({ ...OnPointerDown.mutable(entityB) })
  })


})
