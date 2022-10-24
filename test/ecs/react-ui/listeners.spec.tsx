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
    let counter = 0

    function onClick() {
      counter++
    }

    const ui = () => (
      <UiEntity uiTransform={{ width: 100 }} listeners={{ onClick }} />
    )
    renderUi(ui)
    expect(counter).toBe(0)
    engine.update(1)

    PointerEventsResult.create(engine.RootEntity, {
      commands: [
        createTestPointerDownCommand(uiEntity, 4, PointerEventType.PET_DOWN),
        createTestPointerDownCommand(uiEntity, 5, PointerEventType.PET_UP)
      ]
    })

    engine.update(1)
    expect(counter).toBe(1)
  })
})
