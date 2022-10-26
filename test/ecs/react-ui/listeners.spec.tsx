import { Engine, Entity, IEngine } from '../../../packages/@dcl/ecs/src/engine'
import { createInput } from '../../../packages/@dcl/ecs/src/engine/input'
import {
  ReactEcs,
  renderUi,
  UiEntity
} from '../../../packages/@dcl/react-ecs/src'
import { createTestPointerDownCommand } from '../events/utils'
import { PointerEventType } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/pointer_events.gen'

declare let engine: IEngine

describe('Ui Listeners React Ecs', () => {
  beforeEach(() => {
    engine = (globalThis as any).engine = Engine()
    ;(global as any).Input = createInput(engine)
  })

  it('should run onClick if it was fake-clicked', async () => {
    const { PointerEventsResult } = engine.baseComponents
    const uiEntity = (engine.addEntity() + 1) as Entity
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
  })
})
