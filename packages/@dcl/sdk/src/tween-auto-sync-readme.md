# Automatic Tween Synchronization for Decentraland

This module provides a completely transparent solution for synchronizing tweens across clients in a Decentraland scene. It works automatically with existing code, requiring no changes to your tween creation logic.

## Problem Solved

In standard Decentraland scenes, when a tween starts on one client, other clients who join later have no way to know when the tween started. This leads to animations appearing out of sync for different users. This system solves this by:

1. Automatically tracking when tweens are created
2. Setting the correct currentTime for tweens when new clients join
3. Leveraging the Decentraland engine's built-in tween calculations

## Usage

Simply initialize the synchronization system once at the start of your scene:

```typescript
import { engine } from '@dcl/ecs'
import { initTweenSync } from './tween-auto-sync'
import { myProfile } from './network'

// Determine if this instance is the server/authority
const isServer = checkIfServer() // implement your own logic

// Initialize the tween synchronization system - that's it!
initTweenSync(engine, isServer)

// Then use standard Tween.create normally throughout your code!
// All tweens will automatically be synchronized
```

## Zero Migration Effort

The beauty of this system is that it works with your existing code without any changes:

```typescript
// Your existing tween code:
Tween.create(entity, {
  mode: {
    $case: 'move',
    move: {
      start: { x: 8, y: 1, z: 8 },
      end: { x: 8, y: 3, z: 8 }
    }
  },
  duration: 2,
  easingFunction: 1 // EASE_QUADRATIC_IN
})

// It now automatically synchronizes across all clients!
```

## How It Works

1. When `initTweenSync()` is called, it sets up systems to:
   - Track all tweens created in the scene
   - Automatically add synchronization data to new tweens
   - Process incoming tween data for clients

2. For the server/authority:
   - Each new tween is detected and tagged with its start time
   - This data is synchronized to all clients

3. For clients:
   - When receiving a synchronized tween, the system calculates elapsed time
   - It sets appropriate `currentTime` and adjusted `duration` properties
   - The engine's built-in tween system handles all the actual interpolation

4. All of this happens completely behind the scenes with zero API changes.

## Features

- **Zero Migration**: Works with existing code without any changes
- **Transparent**: No need to learn new APIs or methods
- **Universal**: Works with all tween types (move, scale, rotate)
- **Lightweight**: Minimal overhead and processing
- **Robust**: Leverages the engine's built-in tween calculations

## Best Practices

1. **Authority Model**: Clearly define which client is the authority for starting tweens
2. **Cancellation**: Use standard `Tween.deleteFrom()` to remove tweens when no longer needed
3. **Performance**: For complex scenes with many tweens, consider removing completed tweens

## Limitations

- Very short tweens (<0.1s) may complete before synchronization can happen
- High network latency can affect synchronization accuracy

## Examples

See the example file for complete examples, including:
- Basic synchronized tweening
- Chained tween sequences with different easing functions
- Scale tweens