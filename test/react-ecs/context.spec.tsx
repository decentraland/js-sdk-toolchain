import { Entity } from '../../packages/@dcl/ecs/src/engine'
import { components } from '../../packages/@dcl/ecs/src'
import { ReactEcs, UiEntity, Label } from '../../packages/@dcl/react-ecs/src'
import { setupEngine } from './utils'

const { createContext, useContext } = ReactEcs

describe('ReactEcs Context', () => {
  it('should create a context with a default value and read it via useContext', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiText = components.UiText(engine)
    const entityIndex = engine.addEntity() as number

    const ThemeContext = createContext('light')

    const DisplayTheme = () => {
      const theme = useContext(ThemeContext)
      return <Label value={theme} uiTransform={{ width: 100 }} />
    }

    // No Provider wrapping — should use default value
    const ui = () => <DisplayTheme />

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    const textEntity = (entityIndex + 1) as Entity
    expect(UiText.get(textEntity).value).toBe('light')
  })

  it('should read the value from a Provider', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiText = components.UiText(engine)
    const entityIndex = engine.addEntity() as number

    const ThemeContext = createContext('light')

    const DisplayTheme = () => {
      const theme = useContext(ThemeContext)
      return <Label value={theme} uiTransform={{ width: 100 }} />
    }

    const ui = () => (
      <ThemeContext.Provider value="dark">
        <DisplayTheme />
      </ThemeContext.Provider>
    )

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    const textEntity = (entityIndex + 1) as Entity
    expect(UiText.get(textEntity).value).toBe('dark')
  })

  it('should provide the correct value to nested components', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiText = components.UiText(engine)
    const entityIndex = engine.addEntity() as number

    const CountContext = createContext(0)

    const DisplayCount = () => {
      const count = useContext(CountContext)
      return <Label value={`count:${count}`} uiTransform={{ width: 100 }} />
    }

    const Wrapper = () => (
      <UiEntity uiTransform={{ width: 200 }}>
        <DisplayCount />
      </UiEntity>
    )

    const ui = () => (
      <CountContext.Provider value={42}>
        <Wrapper />
      </CountContext.Provider>
    )

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    const textEntity = (entityIndex + 1) as Entity
    expect(UiText.get(textEntity).value).toBe('count:42')
  })

  it('should update when the provider value changes', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiText = components.UiText(engine)
    const entityIndex = engine.addEntity() as number

    const ThemeContext = createContext('light')

    const DisplayTheme = () => {
      const theme = useContext(ThemeContext)
      return <Label value={theme} uiTransform={{ width: 100 }} />
    }

    let currentTheme = 'dark'
    const ui = () => (
      <ThemeContext.Provider value={currentTheme}>
        <DisplayTheme />
      </ThemeContext.Provider>
    )

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    const textEntity = (entityIndex + 1) as Entity
    expect(UiText.get(textEntity).value).toBe('dark')

    currentTheme = 'blue'
    await engine.update(1)
    expect(UiText.get(textEntity).value).toBe('blue')
  })
})
