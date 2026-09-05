import {
  engine,
  Entity,
  Transform,
  Tween,
  MeshRenderer,
  Material,
  PBTween,
  InputAction,
  PointerEvents,
  PointerEventType,
  TweenSequence,
  TweenLoop
} from '@dcl/ecs'
import { initTweenSync } from './tween-auto-sync'
import { myProfile } from './network'

// Determine which instance is the server
// In a real deployment, you would need a reliable way to determine this
const SERVER_USER_ID = 'server-user-id' // Replace with actual logic to determine server
const isServer = myProfile.userId === SERVER_USER_ID

// Initialize the tween synchronization system
// This one line automatically enables tween synchronization for all tweens in your scene
initTweenSync(engine, isServer)

// EXAMPLE 1: Basic automatic synchronization
// Create a box entity using standard tweens (that will be automatically synchronized)
const boxEntity = engine.addEntity()
Transform.create(boxEntity, {
  position: { x: 8, y: 1, z: 8 }
})

// Add visuals
MeshRenderer.setBox(boxEntity)
Material.setPbrMaterial(boxEntity, {
  albedoColor: isServer
    ? { r: 1, g: 0, b: 0, a: 1 } // Red for server
    : { r: 0, g: 0, b: 1, a: 1 } // Blue for clients
})

// Make the box clickable to cancel tweens
PointerEvents.create(boxEntity, {
  pointerEvents: [
    {
      eventType: PointerEventType.PET_DOWN,
      eventInfo: { button: InputAction.IA_POINTER, hoverText: 'Toggle Tween' }
    }
  ]
})

// Create a standard tween that bounces up and down - it will be automatically synchronized!
if (isServer) {
  Tween.create(boxEntity, {
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

  // Add a TweenSequence to make it bounce continuously
  TweenSequence.create(boxEntity, {
    loop: TweenLoop.TL_YOYO, // This will automatically play back and forth
    sequence: [] // Empty sequence means it will yoyo the current tween
  })
}

// Track last click time to debounce
let lastClickTime = 0

// Handle pointer events for the box
engine.addSystem(() => {
  if (!isServer) return // Only server handles input

  const events = PointerEvents.get(boxEntity).pointerEvents
  for (const event of events) {
    // Only process new clicks and avoid double-processing
    if (event.eventType === PointerEventType.PET_DOWN) {
      const now = Date.now()
      if (now - lastClickTime < 500) continue // Debounce clicks
      lastClickTime = now

      // Toggle tween by simply deleting/recreating it
      if (Tween.has(boxEntity)) {
        // Cancel the tween by removing it
        Tween.deleteFrom(boxEntity)
        TweenSequence.deleteFrom(boxEntity)

        // Change color to indicate stopped state
        Material.setPbrMaterial(boxEntity, {
          albedoColor: { r: 1, g: 1, b: 0, a: 1 } // Yellow when stopped
        })
      } else {
        // Reset color
        Material.setPbrMaterial(boxEntity, {
          albedoColor: { r: 1, g: 0, b: 0, a: 1 } // Back to red
        })

        // Restart the tween
        const currentPosition = Transform.get(boxEntity).position
        Tween.create(boxEntity, {
          mode: {
            $case: 'move',
            move: {
              start: currentPosition,
              end: { x: 8, y: 3, z: 8 }
            }
          },
          duration: 2,
          easingFunction: 1 // EASE_QUADRATIC_IN
        })

        // Re-add the TweenSequence
        TweenSequence.create(boxEntity, {
          loop: TweenLoop.TL_YOYO,
          sequence: []
        })
      }
    }
  }
})

// EXAMPLE 2: Comparison with unsynchronized tweens
// Create another box as a comparison using standard non-synchronized tweens
const regularBox = engine.addEntity()
Transform.create(regularBox, {
  position: { x: 4, y: 1, z: 8 }
})

// Add visuals to our comparison box
MeshRenderer.setBox(regularBox)
Material.setPbrMaterial(regularBox, {
  albedoColor: { r: 0, g: 1, b: 0, a: 1 } // Green for comparison box
})

// Create a standard tween - this would be synchronized if we were on the server
// But to demonstrate the difference, we'll create it on all clients
Tween.create(regularBox, {
  mode: {
    $case: 'move',
    move: {
      start: { x: 4, y: 1, z: 8 },
      end: { x: 4, y: 3, z: 8 }
    }
  },
  duration: 2,
  easingFunction: 1 // EASE_QUADRATIC_IN
})

// Add TweenSequence to make it bounce continuously
TweenSequence.create(regularBox, {
  loop: TweenLoop.TL_YOYO,
  sequence: []
})

// EXAMPLE 3: Complex path using TweenSequence
// Create a sphere that demonstrates a complex path using TweenSequence
const sphereEntity = engine.addEntity()
Transform.create(sphereEntity, {
  position: { x: 12, y: 1, z: 8 },
  scale: { x: 0.7, y: 0.7, z: 0.7 }
})

// Add visuals to our sphere
MeshRenderer.setSphere(sphereEntity)
Material.setPbrMaterial(sphereEntity, {
  albedoColor: { r: 1, g: 0.5, b: 0, a: 1 } // Orange sphere
})

// Create sequence of tweens to follow a complex path
if (isServer) {
  // First tween - start position
  Tween.create(sphereEntity, {
    mode: {
      $case: 'move',
      move: {
        start: { x: 12, y: 1, z: 8 },
        end: { x: 12, y: 3, z: 8 }
      }
    },
    duration: 1.5,
    easingFunction: 4 // EASE_CUBIC_IN
  })

  // Define the sequence of tweens that will follow
  TweenSequence.create(sphereEntity, {
    sequence: [
      // Move right with EASE_SINE_INOUT
      {
        mode: {
          $case: 'move',
          move: {
            start: { x: 12, y: 3, z: 8 },
            end: { x: 14, y: 3, z: 8 }
          }
        },
        duration: 1.5,
        easingFunction: 15 // EASE_SINE_INOUT
      },
      // Move down with EASE_CUBIC_OUT
      {
        mode: {
          $case: 'move',
          move: {
            start: { x: 14, y: 3, z: 8 },
            end: { x: 14, y: 1, z: 8 }
          }
        },
        duration: 1.5,
        easingFunction: 5 // EASE_CUBIC_OUT
      },
      // Move back to start with EASE_QUADRATIC_INOUT
      {
        mode: {
          $case: 'move',
          move: {
            start: { x: 14, y: 1, z: 8 },
            end: { x: 12, y: 1, z: 8 }
          }
        },
        duration: 1.5,
        easingFunction: 3 // EASE_QUADRATIC_INOUT
      }
    ],
    loop: TweenLoop.TL_RESTART // Restart the entire sequence when complete
  })
}

// EXAMPLE 4: Scale tween with synchronization
const cubeEntity = engine.addEntity()
Transform.create(cubeEntity, {
  position: { x: 10, y: 1, z: 12 }
})

// Add visuals
MeshRenderer.setBox(cubeEntity)
Material.setPbrMaterial(cubeEntity, {
  albedoColor: { r: 0.5, g: 0, b: 0.5, a: 1 } // Purple cube
})

// Create a scale tween with automatic synchronization
if (isServer) {
  Tween.create(cubeEntity, {
    mode: {
      $case: 'scale',
      scale: {
        start: { x: 1, y: 1, z: 1 },
        end: { x: 1.5, y: 1.5, z: 1.5 }
      }
    },
    duration: 2,
    easingFunction: 16 // EASE_EXPONENTIAL_IN
  })

  // Add a TweenSequence to make it scale up and down continuously
  TweenSequence.create(cubeEntity, {
    loop: TweenLoop.TL_YOYO,
    sequence: []
  })
}
