import { Engine, Entity, IEngine } from '../../packages/@dcl/ecs/src/engine'
import { createInput } from '../../packages/@dcl/ecs/src/engine/input'
import { ReactEcs, renderUi, UiEntity } from '../../packages/@dcl/react-ecs/src'
import { createTestPointerDownCommand } from '../ecs/events/utils'
import { PointerEventType } from '../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/pointer_hover_feedback.gen'
import { EventsSystem } from '../../packages/@dcl/ecs/src/systems/events'

let engine: IEngine

describe('Ui Listeners React Ecs', () => {
  beforeEach(() => {
    engine = Engine()
    const Input = createInput(engine)
    engine.addSystem(EventsSystem.update(Input))
  })

  it('should run onClick if it was fake-clicked', async () => {
    const { PointerEventsResult } = engine.baseComponents
    const uiEntity = (engine.addEntity() as number + 1) as Entity
    let fakeCounter = 0
    const fakeClick = () => {
      PointerEventsResult.createOrReplace(engine.RootEntity, {
        commands: [
          createTestPointerDownCommand(
            uiEntity,
            fakeCounter + 1,
            PointerEventType.PET_DOWN
          ),
          createTestPointerDownCommand(
            uiEntity,
            fakeCounter + 2,
            PointerEventType.PET_UP
          )
        ]
      })
      fakeCounter += 1
    }

    let counter = 0
    let onClick: (() => void) | undefined = () => {
      counter++
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const ui = () => <UiEntity uiTransform={{ width: 100 }} onClick={onClick} />
    renderUi(ui)
    expect(counter).toBe(0)
    engine.update(1)

    // Click with the current onclick
    fakeClick()
    engine.update(1)
    expect(counter).toBe(1)

    fakeClick()
    engine.update(1)
    expect(counter).toBe(2)

    // Remove onClick
    onClick = undefined
    engine.update(1)
    fakeClick()
    engine.update(1)
    expect(counter).toBe(2)

    // Add a new onclick
    onClick = () => {
      counter = 8888
    }
    engine.update(1)
    fakeClick()

    engine.update(1)
    expect(counter).toBe(8888)

    // Update onclick listener
    onClick = () => {
      counter = 8
    }
    engine.update(1)
    fakeClick()
    engine.update(1)
    expect(counter).toBe(8)
  })
})
