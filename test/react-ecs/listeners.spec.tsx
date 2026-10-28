import { Entity } from '../../packages/@dcl/ecs'
import { components, PBPointerEventsResult, PointerEventType } from '../../packages/@dcl/ecs/src'
import { ReactEcs, UiEntity } from '../../packages/@dcl/react-ecs/src'
import { createTestPointerDownCommand } from '../ecs/events/utils'
import { setupEngine } from './utils'

describe('Ui MosueDown React Ecs', () => {
  const { engine, uiRenderer } = setupEngine()

  const PointerEventsResult = components.PointerEventsResult(engine)
  const uiEntity = ((engine.addEntity() as number) + 1) as Entity
  let fakeCounter = 0
  const mouseDownEvent = () => {
    PointerEventsResult.addValue(
      uiEntity,
      createTestPointerDownCommand(uiEntity, fakeCounter + 1, PointerEventType.PET_DOWN)
    )
    fakeCounter += 1
  }
  let counter = 0
  let onMouseDown: (() => void) | undefined = () => {
    counter++
  }

  const ui = () => <UiEntity uiTransform={{ width: 100 }} onMouseDown={onMouseDown} />
  uiRenderer.setUiRenderer(ui)

  it('the counter should be 0 at the begginning', async () => {
    expect(counter).toBe(0)
    await engine.update(1)
  })
  it('if we create a mouseDown event, then the onMouseDown fn must be called and increment the counter by 1', async () => {
    // Click with the current onMouseDown
    mouseDownEvent()
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('remove onMouseDown handler and verify that the counter is still 1', async () => {
    // Remove onMouseDown
    onMouseDown = undefined
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('create a mouseDown event and verify that the counter is not being incremented', async () => {
    mouseDownEvent()
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('replace onMouseDown callback with a custom counter setter, and create an event to see if its being called', async () => {
    onMouseDown = () => {
      counter = 8888
    }
    await engine.update(1)
    mouseDownEvent()
    await engine.update(1)
    expect(counter).toBe(8888)
  })

  it('replace onMouseDown callback again for test-coverage with a custom counter setter', async () => {
    onMouseDown = () => {
      counter = 4
    }
    await engine.update(1)
    mouseDownEvent()
    await engine.update(1)
    expect(counter).toBe(4)
  })
})

describe('Ui MouseUp React Ecs', () => {
  const { engine, uiRenderer } = setupEngine()
  const PointerEventsResult = components.PointerEventsResult(engine)
  const uiEntity = ((engine.addEntity() as number) + 1) as Entity
  let fakeCounter = 0
  const mouseDownEvent = () => {
    PointerEventsResult.addValue(
      uiEntity,
      createTestPointerDownCommand(uiEntity, fakeCounter + 1, PointerEventType.PET_UP)
    )
    fakeCounter += 1
  }
  let counter = 0
  let onMouseUp: (() => void) | undefined = () => {
    counter++
  }

  const ui = () => <UiEntity uiTransform={{ width: 100 }} onMouseUp={onMouseUp} />
  uiRenderer.setUiRenderer(ui)

  it('the counter should be 0 at the begginning', async () => {
    expect(counter).toBe(0)
    await engine.update(1)
  })
  it('if we create a mouseDown event, then the onMouseUp fn must be called and increment the counter by 1', async () => {
    // Click with the current onMouseUp
    mouseDownEvent()
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('remove onMouseUp handler and verify that the counter is still 1', async () => {
    // Remove onMouseUp
    onMouseUp = undefined
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('create a mouseDown event and verify that the counter is not being incremented', async () => {
    mouseDownEvent()
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('replace onMouseUp callback with a custom counter setter, and create an event to see if its being called', async () => {
    // Add a new onMouseUp
    onMouseUp = () => {
      counter = 8888
    }
    await engine.update(1)
    mouseDownEvent()
    await engine.update(1)
    expect(counter).toBe(8888)
  })
})

describe('Ui MouseEnter React Ecs', () => {
  const { engine, uiRenderer } = setupEngine()
  const PointerEventsResult = components.PointerEventsResult(engine)
  const uiEntity = ((engine.addEntity() as number) + 1) as Entity
  let fakeCounter = 0
  const mouseEnterEvent = () => {
    PointerEventsResult.addValue(
      uiEntity,
      createTestPointerDownCommand(uiEntity, fakeCounter + 1, PointerEventType.PET_HOVER_ENTER)
    )
    fakeCounter += 1
  }
  let counter = 0
  let onMouseEnter: (() => void) | undefined = () => {
    counter++
  }

  const ui = () => <UiEntity uiTransform={{ width: 100 }} onMouseEnter={onMouseEnter} />
  uiRenderer.setUiRenderer(ui)

  it('the counter should be 0 at the begginning', async () => {
    expect(counter).toBe(0)
    await engine.update(1)
  })
  it('if we create a mouseDown event, then the onMouseEnter fn must be called and increment the counter by 1', async () => {
    // Click with the current onMouseEnter
    mouseEnterEvent()
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('remove onMouseEnter handler and verify that the counter is still 1', async () => {
    // Remove onMouseEnter
    onMouseEnter = undefined
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('create a mouseDown event and verify that the counter is not being incremented', async () => {
    mouseEnterEvent()
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('replace onMouseEnter callback with a custom counter setter, and create an event to see if its being called', async () => {
    // Add a new onMouseEnter
    onMouseEnter = () => {
      counter = 8888
    }
    await engine.update(1)
    mouseEnterEvent()
    await engine.update(1)
    expect(counter).toBe(8888)
  })
})

describe('Ui MouseLeave React Ecs', () => {
  const { engine, uiRenderer } = setupEngine()
  const PointerEventsResult = components.PointerEventsResult(engine)
  const uiEntity = ((engine.addEntity() as number) + 1) as Entity
  let fakeCounter = 0
  const mouseLeaveEvent = () => {
    PointerEventsResult.addValue(
      uiEntity,
      createTestPointerDownCommand(uiEntity, fakeCounter + 1, PointerEventType.PET_HOVER_LEAVE)
    )
    fakeCounter += 1
  }
  let counter = 0
  let onMouseLeave: (() => void) | undefined = () => {
    counter++
  }

  const ui = () => <UiEntity uiTransform={{ width: 100 }} onMouseLeave={onMouseLeave} />
  uiRenderer.setUiRenderer(ui)

  it('the counter should be 0 at the begginning', async () => {
    expect(counter).toBe(0)
    await engine.update(1)
  })
  it('if we create a mouseDown event, then the onMouseLeave fn must be called and increment the counter by 1', async () => {
    // Click with the current onMouseLeave
    mouseLeaveEvent()
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('remove onMouseLeave handler and verify that the counter is still 1', async () => {
    // Remove onMouseLeave
    onMouseLeave = undefined
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('create a mouseDown event and verify that the counter is not being incremented', async () => {
    mouseLeaveEvent()
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('replace onMouseLeave callback with a custom counter setter, and create an event to see if its being called', async () => {
    // Add a new onMouseLeave
    onMouseLeave = () => {
      counter = 8888
    }
    await engine.update(1)
    mouseLeaveEvent()
    await engine.update(1)
    expect(counter).toBe(8888)
  })
})

describe('Ui onMouseDrag React Ecs', () => {
  const { engine, uiRenderer } = setupEngine()

  const PointerEventsResult = components.PointerEventsResult(engine)
  const uiEntity = ((engine.addEntity() as number) + 1) as Entity
  let fakeCounter = 0
  const dragEvent = () => {
    PointerEventsResult.addValue(
      uiEntity,
      createTestPointerDownCommand(uiEntity, fakeCounter + 1, PointerEventType.PET_DRAG)
    )
    fakeCounter += 1
  }
  let counter = 0
  let onMouseDrag: (() => void) | undefined = () => {
    counter++
  }

  const ui = () => <UiEntity uiTransform={{ width: 100 }} onMouseDrag={onMouseDrag} />
  uiRenderer.setUiRenderer(ui)

  it('the counter should be 0 at the beginning', async () => {
    expect(counter).toBe(0)
    await engine.update(1)
  })

  it('a PET_DRAG event calls onMouseDrag and increments the counter', async () => {
    dragEvent()
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('after removing the onMouseDrag handler the counter no longer increments', async () => {
    onMouseDrag = undefined
    await engine.update(1)
    dragEvent()
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('a replaced onMouseDrag callback is the one that gets called', async () => {
    onMouseDrag = () => {
      counter = 8888
    }
    await engine.update(1)
    dragEvent()
    await engine.update(1)
    expect(counter).toBe(8888)
  })
})

describe('Ui onMouseDragLocked React Ecs', () => {
  const { engine, uiRenderer } = setupEngine()

  const PointerEventsResult = components.PointerEventsResult(engine)
  const uiEntity = ((engine.addEntity() as number) + 1) as Entity
  let fakeCounter = 0
  const dragEvent = () => {
    PointerEventsResult.addValue(
      uiEntity,
      createTestPointerDownCommand(uiEntity, fakeCounter + 1, PointerEventType.PET_DRAG_LOCKED)
    )
    fakeCounter += 1
  }
  let counter = 0
  let onMouseDragLocked: (() => void) | undefined = () => {
    counter++
  }

  const ui = () => <UiEntity uiTransform={{ width: 100 }} onMouseDragLocked={onMouseDragLocked} />
  uiRenderer.setUiRenderer(ui)

  it('the counter should be 0 at the beginning', async () => {
    expect(counter).toBe(0)
    await engine.update(1)
  })

  it('a PET_DRAG_LOCKED event calls onMouseDragLocked and increments the counter', async () => {
    dragEvent()
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('after removing the onMouseDragLocked handler the counter no longer increments', async () => {
    onMouseDragLocked = undefined
    await engine.update(1)
    dragEvent()
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('a replaced onMouseDragLocked callback is the one that gets called', async () => {
    onMouseDragLocked = () => {
      counter = 8888
    }
    await engine.update(1)
    dragEvent()
    await engine.update(1)
    expect(counter).toBe(8888)
  })
})

describe('Ui onMouseDragEnd React Ecs', () => {
  const { engine, uiRenderer } = setupEngine()

  const PointerEventsResult = components.PointerEventsResult(engine)
  const uiEntity = ((engine.addEntity() as number) + 1) as Entity
  let fakeCounter = 0
  const dragEvent = () => {
    PointerEventsResult.addValue(
      uiEntity,
      createTestPointerDownCommand(uiEntity, fakeCounter + 1, PointerEventType.PET_DRAG_END)
    )
    fakeCounter += 1
  }
  let counter = 0
  let onMouseDragEnd: (() => void) | undefined = () => {
    counter++
  }

  const ui = () => <UiEntity uiTransform={{ width: 100 }} onMouseDragEnd={onMouseDragEnd} />
  uiRenderer.setUiRenderer(ui)

  it('the counter should be 0 at the beginning', async () => {
    expect(counter).toBe(0)
    await engine.update(1)
  })

  it('a PET_DRAG_END event calls onMouseDragEnd and increments the counter', async () => {
    dragEvent()
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('after removing the onMouseDragEnd handler the counter no longer increments', async () => {
    onMouseDragEnd = undefined
    await engine.update(1)
    dragEvent()
    await engine.update(1)
    expect(counter).toBe(1)
  })

  it('a replaced onMouseDragEnd callback is the one that gets called', async () => {
    onMouseDragEnd = () => {
      counter = 8888
    }
    await engine.update(1)
    dragEvent()
    await engine.update(1)
    expect(counter).toBe(8888)
  })
})

describe('Ui listener callbacks receive the pointer event', () => {
  const { engine, uiRenderer } = setupEngine()
  const PointerEventsResult = components.PointerEventsResult(engine)
  const uiEntity = ((engine.addEntity() as number) + 1) as Entity
  let received: PBPointerEventsResult | undefined
  const ui = () => (
    <UiEntity
      uiTransform={{ width: 100 }}
      onMouseDrag={(event) => {
        received = event
      }}
    />
  )
  uiRenderer.setUiRenderer(ui)

  it('passes the PointerEventsResult that fired the handler', async () => {
    await engine.update(1)
    const command = createTestPointerDownCommand(uiEntity, 1, PointerEventType.PET_DRAG)
    PointerEventsResult.addValue(uiEntity, command)
    await engine.update(1)
    expect(received).toBeDefined()
    expect(received?.state).toBe(PointerEventType.PET_DRAG)
    expect(received?.hit).toStrictEqual(command.hit)
  })
})
