# @dcl/react-ecs

React bindings for Decentraland's Entity Component System (ECS), providing a declarative way to build UIs in Decentraland scenes using React's component model and JSX syntax.

## Features

- **Flexbox-based Layout**: Implements a subset of CSS Flexbox for powerful and intuitive UI layouts
- **React Components**: Familiar React-like component API for building UIs
- **Type Safety**: Full TypeScript support with proper type definitions
- **Event Handling**: Support for mouse events and user interactions
- **Performance**: Optimized reconciliation for minimal runtime overhead
- **Theme Support**: Built-in light and dark theme system with context-based switching

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
