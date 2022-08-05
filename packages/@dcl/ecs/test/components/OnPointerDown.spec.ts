import { ActionButton } from '../../src/components/generated/pb/common/ActionButton.gen'
import { ensureEngineAndComponents } from './utils'

describe('Generated OnPointerDown ProtoBuf', () => {
  it('should serialize/deserialize OnPointerDown', async () => {
    const {
      engine: newEngine,
      components: { OnPointerDown }
    } = await ensureEngineAndComponents()

    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()
    OnPointerDown.create(newEngine.addEntity())
    const onPointerDown = OnPointerDown.create(entity, {
      button: ActionButton.PRIMARY,
      hoverText: 'Tap to run',
      distance: 10,
      showFeedback: true
    })

    OnPointerDown.create(entityB, {
      button: ActionButton.SECONDARY,
      hoverText: 'TCker',
      distance: 5,
      showFeedback: false
    })
    const buffer = OnPointerDown.toBinary(entity)
    OnPointerDown.updateFromBinary(entityB, buffer)

    expect(onPointerDown).toEqual({ ...OnPointerDown.mutable(entityB) })
  })

  it('should receive OnPointerResult', async () => {
    const {
      engine: newEngine,
      components: { OnPointerDownResult, OnPointerDown }
    } = await ensureEngineAndComponents()

    const entity = newEngine.addEntity()
    OnPointerDown.create(newEngine.addEntity())

    // We create an onPointerDownEvent
    OnPointerDown.create(entity, {
      button: ActionButton.PRIMARY,
      hoverText: 'Tap to run',
      distance: 10,
      showFeedback: true
    })

    // wait a tick to receive a response
    newEngine.update(1 / 30)

    // We receive an OnPointerResult
    OnPointerDownResult.create(entity, {
      button: ActionButton.PRIMARY,
      point: { x: 1, y: 2, z: 3 },
      distance: 10,
      direction: { x: 1, y: 2, z: 3 },
      normal: { x: 1, y: 2, z: 3 },
      origin: { x: 1, y: 2, z: 3 },
      meshName: 'mesh',
      timestamp: 243
    })

    expect(OnPointerDownResult.has(entity))
  })
})
