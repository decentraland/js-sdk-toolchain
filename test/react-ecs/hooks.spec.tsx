import { Entity } from '../../packages/@dcl/ecs'
import { components, PointerEventType } from '../../packages/@dcl/ecs/src'
import { ReactEcs, UiEntity, Label } from '../../packages/@dcl/react-ecs/src'
import { CANVAS_ROOT_ENTITY } from '../../packages/@dcl/react-ecs/src/components/uiTransform'
import { createTestPointerDownCommand } from '../ecs/events/utils'
import { setupEngine } from './utils'

describe('useMemo hook', () => {
  it('should memoize a computed value and update when deps change', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiText = components.UiText(engine)
    const entityIndex = engine.addEntity() as number
    const labelEntity = (entityIndex + 1) as Entity

    let dep = 10
    let computeCount = 0
    const ui = () => {
      const value = ReactEcs.useMemo(() => {
        computeCount++
        return dep * 2
      }, [dep])
      return <Label uiTransform={{ width: 100 }} value={`${value}`} />
    }

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    expect(UiText.get(labelEntity).value).toBe('20')
    expect(computeCount).toBe(1)

    // Re-render without changing dep — factory should NOT re-run
    await engine.update(1)
    expect(computeCount).toBe(1)

    // Change dep — factory should re-run
    dep = 25
    await engine.update(1)
    expect(UiText.get(labelEntity).value).toBe('50')
    expect(computeCount).toBe(2)
  })
})

describe('useCallback hook', () => {
  it('should provide a stable callback that fires correctly', async () => {
    const { engine, uiRenderer } = setupEngine()
    const PointerEventsResult = components.PointerEventsResult(engine)
    const entityIndex = engine.addEntity() as number
    const uiEntity = (entityIndex + 1) as Entity

    let counter = 0
    let fakeCounter = 0
    const mouseDownEvent = () => {
      PointerEventsResult.addValue(
        uiEntity,
        createTestPointerDownCommand(uiEntity, fakeCounter + 1, PointerEventType.PET_DOWN)
      )
      fakeCounter += 1
    }

    const ui = () => {
      const handler = ReactEcs.useCallback(() => {
        counter++
      }, [])
      return <UiEntity uiTransform={{ width: 100 }} onMouseDown={handler} />
    }

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(counter).toBe(0)

    mouseDownEvent()
    await engine.update(1)
    expect(counter).toBe(1)

    mouseDownEvent()
    await engine.update(1)
    expect(counter).toBe(2)
  })
})

describe('useRef hook', () => {
  it('should persist .current across re-renders', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiText = components.UiText(engine)
    const entityIndex = engine.addEntity() as number
    const labelEntity = (entityIndex + 1) as Entity

    const ui = () => {
      const renderCount = ReactEcs.useRef(0)
      renderCount.current += 1
      return <Label uiTransform={{ width: 100 }} value={`${renderCount.current}`} />
    }

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(UiText.get(labelEntity).value).toBe('1')

    await engine.update(1)
    expect(UiText.get(labelEntity).value).toBe('2')

    await engine.update(1)
    expect(UiText.get(labelEntity).value).toBe('3')
  })
})

describe('useReducer hook', () => {
  it('should manage state transitions with actions', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiText = components.UiText(engine)
    const entityIndex = engine.addEntity() as number
    const labelEntity = (entityIndex + 1) as Entity

    type State = { count: number }
    type Action = 'increment' | 'reset'

    const reducer = (state: State, action: Action): State => {
      switch (action) {
        case 'increment':
          return { count: state.count + 1 }
        case 'reset':
          return { count: 0 }
      }
    }

    let dispatch: (action: Action) => void = () => {}

    const ui = () => {
      const [state, _dispatch] = ReactEcs.useReducer(reducer, { count: 0 })
      dispatch = _dispatch
      return <Label uiTransform={{ width: 100 }} value={`count:${state.count}`} />
    }

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(UiText.get(labelEntity).value).toBe('count:0')

    dispatch('increment')
    await engine.update(1)
    expect(UiText.get(labelEntity).value).toBe('count:1')

    dispatch('increment')
    await engine.update(1)
    expect(UiText.get(labelEntity).value).toBe('count:2')

    dispatch('reset')
    await engine.update(1)
    expect(UiText.get(labelEntity).value).toBe('count:0')
  })
})

describe('React.memo', () => {
  it('should skip re-rendering child when props are unchanged', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const entityIndex = engine.addEntity() as number

    // Entity layout: child is created first (entityIndex+1), then parent (entityIndex+2)
    const childEntity = (entityIndex + 1) as Entity
    const parentEntity = (entityIndex + 2) as Entity

    let childRenderCount = 0

    const Child = ReactEcs.memo((props: { width: number }) => {
      childRenderCount++
      return <UiEntity uiTransform={{ width: props.width }} />
    })

    let parentWidth = 100
    const childWidth = 200

    const ui = () => (
      <UiEntity uiTransform={{ width: parentWidth }}>
        <Child width={childWidth} />
      </UiEntity>
    )

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    expect(childRenderCount).toBe(1)
    expect(UiTransform.get(childEntity).width).toBe(200)
    expect(UiTransform.get(parentEntity).width).toBe(100)

    // Change parent width only — child props unchanged, memo should prevent re-render
    parentWidth = 300
    const renderCountBefore = childRenderCount
    await engine.update(1)

    expect(UiTransform.get(parentEntity).width).toBe(300)
    expect(childRenderCount).toBe(renderCountBefore)
  })
})
