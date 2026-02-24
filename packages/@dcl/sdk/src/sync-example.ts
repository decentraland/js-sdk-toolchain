import {
  engine,
  Entity,
  Transform,
  Tween,
  AudioSource,
  VideoPlayer,
  MeshRenderer,
  Material,
  PointerEvents,
  InputAction,
  PointerEventType,
  TweenSequence,
  TweenLoop
} from '@dcl/ecs'
import { initTweenSync } from './tween-auto-sync'
import { initMediaSync } from './media-sync'
import { myProfile } from './network'

// Example of how to use the automatic synchronization systems in a scene

// Determine which instance is the server (in a real scene, you'd use a more robust method)
const isServer = myProfile.userId === 'server-user-id' // Example only

// Initialize both synchronization systems
initTweenSync(engine, isServer)
initMediaSync(engine, isServer)

// Create some example entities if we're the server
if (isServer) {
  // Create a box that moves with synchronized tweens
  const box = engine.addEntity()
  Transform.create(box, {
    position: { x: 8, y: 1, z: 8 }
  })
  MeshRenderer.setBox(box)
  Material.setPbrMaterial(box, {
    albedoColor: { r: 1, g: 0, b: 0, a: 1 }
  })

  // Add a tween - this will be automatically synchronized
  Tween.create(box, {
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

  // Add a TweenSequence to make it loop continuously
  TweenSequence.create(box, {
    loop: TweenLoop.TL_YOYO,
    sequence: [] // Empty sequence means it will yoyo the current tween
  })

  // Create an entity with audio that will be synchronized
  const audioEntity = engine.addEntity()
  Transform.create(audioEntity, {
    position: { x: 10, y: 1, z: 10 }
  })
  MeshRenderer.setSphere(audioEntity)
  Material.setPbrMaterial(audioEntity, {
    albedoColor: { r: 0, g: 1, b: 0, a: 1 }
  })

  // Add an audio source - this will be automatically synchronized
  AudioSource.create(audioEntity, {
    audioClipUrl: 'sounds/example.mp3',
    playing: true,
    loop: true,
    volume: 1.0
  })

  // Add pointer interaction to toggle audio
  PointerEvents.create(audioEntity, {
    pointerEvents: [
      {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: { button: InputAction.IA_POINTER, hoverText: 'Toggle Audio' }
      }
    ]
  })

  // Create an entity with video that will be synchronized
  const videoEntity = engine.addEntity()
  Transform.create(videoEntity, {
    position: { x: 12, y: 1, z: 12 }
  })

  // Add a video player - this will be automatically synchronized
  VideoPlayer.create(videoEntity, {
    src: 'videos/example.mp4',
    playing: true,
    loop: true,
    volume: 1.0
  })

  // System to handle interaction
  engine.addSystem(() => {
    // Handle audio toggling
    const audioEvents = PointerEvents.get(audioEntity).pointerEvents
    for (const event of audioEvents) {
      if (event.eventType === PointerEventType.PET_DOWN) {
        const audioSource = AudioSource.getMutable(audioEntity)
        audioSource.playing = !audioSource.playing
      }
    }
  })
}

// Note: No additional code is needed to keep tweens, audio, and video synchronized
// The initTweenSync and initMediaSync systems handle all synchronization automatically
