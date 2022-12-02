import {
  Engine,
  Entity,
  IEngine,
  createPointerEventSystem,
  // PointerEventType,
  createInputSystem
} from '../../packages/@dcl/ecs'
import {
  components,
  IEngine as IIEngine,
  PointerEventType
} from '../../packages/@dcl/ecs/src'
import {
  createReactBasedUiSystem,
  ReactBasedUiSystem,
  ReactEcs,
  UiEntity
} from '../../packages/@dcl/react-ecs/src'
import { createTestPointerDownCommand } from '../ecs/events/utils'

describe('Ui Listeners React Ecs', () => {
  let engine: IEngine
  let uiRenderer: ReactBasedUiSystem

  beforeEach(() => {
    engine = Engine()
    const Input = createInputSystem(engine)
    uiRenderer = createReactBasedUiSystem(
      engine,
      createPointerEventSystem(engine, Input)
    )
  })

  it('should run onClick if it was fake-clicked', async () => {
    const PointerEventsResult = components.PointerEventsResult(
      engine as IIEngine
    )
    const uiEntity = ((engine.addEntity() as number) + 1) as Entity
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
    uiRenderer.setUiRenderer(ui)
    expect(counter).toBe(0)
    await engine.update(1)

    // Click with the current onclick
    fakeClick()
    await engine.update(1)
    expect(counter).toBe(1)

    fakeClick()
    await engine.update(1)
    expect(counter).toBe(2)

    // Remove onClick
    onClick = undefined
    await engine.update(1)
    fakeClick()
    await engine.update(1)
    expect(counter).toBe(2)

    // Add a new onclick
    onClick = () => {
      counter = 8888
    }
    await engine.update(1)
    fakeClick()

    await engine.update(1)
    expect(counter).toBe(8888)

    // Update onclick listener
    onClick = () => {
      counter = 8
    }
    await engine.update(1)
    fakeClick()
    await engine.update(1)
    expect(counter).toBe(8)
  })
})
