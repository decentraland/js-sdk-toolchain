# @dcl/react-ecs

React bindings for Decentraland's Entity Component System (ECS), providing a declarative way to build UIs in Decentraland scenes using React's component model and JSX syntax.

## Features

- **Flexbox-based Layout**: Implements a subset of CSS Flexbox for powerful and intuitive UI layouts
- **React Components**: Familiar React-like component API for building UIs
- **Type Safety**: Full TypeScript support with proper type definitions
- **Event Handling**: Support for mouse events and user interactions
- **Performance**: Optimized reconciliation for minimal runtime overhead
- **Context API**: `createContext` and `useContext` for sharing state across component trees without prop drilling
- **Theme Support**: Built-in light and dark theme system with context-based switching

## Context API

Use `createContext` and `useContext` to share state across deeply nested components without passing props through every level.

### Creating and providing a context

```tsx
import { ReactEcs, UiEntity, Label } from '@dcl/react-ecs'

const { createContext, useContext, useState } = ReactEcs

// Create a context with a default value
const PlayerContext = createContext({ health: 100, mana: 50, name: 'Player' })

// A deeply nested component that consumes the context directly
function HealthBar() {
  const { health, name } = useContext(PlayerContext)
  return (
    <UiEntity uiTransform={{ flexDirection: 'row', width: '100%' }}>
      <Label value={`${name}: ${health} HP`} uiTransform={{ width: 200 }} />
    </UiEntity>
  )
}

function ManaBar() {
  const { mana } = useContext(PlayerContext)
  return <Label value={`Mana: ${mana}`} uiTransform={{ width: 200 }} />
}

// Intermediate component that doesn't need to know about player state
function StatsPanel() {
  return (
    <UiEntity uiTransform={{ flexDirection: 'column' }}>
      <HealthBar />
      <ManaBar />
    </UiEntity>
  )
}

// Root component wraps the tree with a Provider
export function GameUI() {
  const [player, setPlayer] = useState({ health: 80, mana: 30, name: 'Adventurer' })

  return (
    <PlayerContext.Provider value={player}>
      <StatsPanel />
    </PlayerContext.Provider>
  )
}
```

### Using default values (no Provider)

When no `Provider` is present in the tree, `useContext` returns the default value passed to `createContext`:

```tsx
const ThemeContext = createContext('light')

function ThemedLabel() {
  const theme = useContext(ThemeContext) // returns 'light' (the default)
  return <Label value={`Theme: ${theme}`} uiTransform={{ width: 200 }} />
}

// No Provider needed if you only need the default value
export function SimpleUI() {
  return <ThemedLabel />
}
```

### Multiple contexts

You can compose multiple contexts for different concerns:

```tsx
const ThemeContext = createContext('dark')
const LocaleContext = createContext('en')

function LocalizedButton() {
  const theme = useContext(ThemeContext)
  const locale = useContext(LocaleContext)
  const label = locale === 'es' ? 'Jugar' : 'Play'
  return <Button value={label} onMouseDown={() => {}} />
}

export function GameUI() {
  return (
    <ThemeContext.Provider value="light">
      <LocaleContext.Provider value="es">
        <LocalizedButton />
      </LocaleContext.Provider>
    </ThemeContext.Provider>
  )
}
```

## Component Guidelines

All components in @dcl/react-ecs must:

- Return JSX.Elements for consistency and composability
- Support theme integration through context
- Be reusable and composable with other components

## Installation

```bash
npm install @dcl/react-ecs
```

## Basic Usage

```tsx
import { ReactEcs, UiEntity, Label, Button } from '@dcl/react-ecs'

export function MyUI() {
  return (
    <UiEntity
      uiTransform={{
        width: 300,
        height: 100,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <Label value="Hello Decentraland!" />
      <Button value="Click Me!" onMouseDown={() => console.log('clicked!')} />
    </UiEntity>
  )
}
```

## Theme System

The package includes a theme system for consistent UI styling:

```tsx
import { ReactEcs, ThemeProvider, Button } from '@dcl/react-ecs'

// Wrap your UI with ThemeProvider
export function MyUI() {
  return (
    <ThemeProvider>
      <Button value="Theme-Aware Button" />
    </ThemeProvider>
  )
}

// Use themes in custom components
function CustomComponent() {
  const { theme, toggleTheme } = React.useContext(ThemeContext)

  return (
    <UiEntity
      uiBackground={{
        color: theme === 'light' ? '#FFFFFF' : '#000000'
      }}
      onMouseDown={toggleTheme}
    />
  )
}
```

## Components

### Core Components

- **UiEntity**: Base component for UI elements
- **Label**: Text display component
- **Button**: Interactive button component
- **Input**: Text input field
- **Dropdown**: Selection dropdown menu

### Layout System

The layout system is based on Flexbox and supports the following properties:

- `display: 'flex'`
- `flexDirection: 'row' | 'column'`
- `justifyContent: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'`
- `alignItems: 'flex-start' | 'center' | 'flex-end' | 'stretch'`
- `width`, `height`
- `margin`, `padding`
- `positionType: 'absolute' | 'relative'`

## Event Handling

Components support the following mouse events:

```tsx
<Button onMouseDown={() => {}} onMouseUp={() => {}} onMouseEnter={() => {}} onMouseLeave={() => {}} />
```

## Technical Details

The package implements a custom React reconciler that bridges React's component model with Decentraland's ECS. It:

1. Translates JSX into ECS entities and components
2. Manages component lifecycle and updates
3. Handles event delegation and bubbling
4. Provides a performant update mechanism

## Related Documentation

For more details about the UI system architecture and design decisions:

- [ADR-124: Implementing Flexbox-based UI](https://adr.decentraland.org/adr/ADR-124)
- [ADR-125: User Interface Components](https://adr.decentraland.org/adr/ADR-125)
- [ADR-237: SDK 7 Custom UI Components](https://adr.decentraland.org/adr/ADR-237)

## License

Apache 2.0
