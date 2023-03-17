import { createFsInMemory } from '../../logic/in-memory-storage'

const mainComposite = {
  id: 'main',
  components: [
    {
      name: 'core::Transform',
      data: {
        '512': {
          position: {
            x: 8,
            y: 0.8,
            z: 8
          }
        }
      }
    },
    {
      name: 'core::MeshRenderer',
      data: {
        '512': {
          mesh: {
            $case: 'box',
            box: {
              uvs: []
            }
          }
        }
      }
    },
    {
      name: 'core::MeshCollider',
      data: {
        '512': {
          mesh: {
            $case: 'box',
            box: {}
          }
        }
      }
    },
    {
      name: 'cube-id',
      data: {
        '512': {}
      }
    },
    {
      name: 'core::PointerEvents',
      data: {
        '512': {
          pointerEvents: [
            {
              eventType: 1,
              eventInfo: {
                button: 1,
                hoverText: 'Press F to spawn',
                maxDistance: 100,
                showFeedback: true
              }
            }
          ]
        }
      }
    },
    {
      name: 'core::Material',
      data: {
        '512': {
          material: {
            $case: 'pbr',
            pbr: {
              albedoColor: {
                r: 0.0,
                g: 0.85,
                b: 0.42,
                a: 1.0
              }
            }
          }
        }
      }
    }
  ]
}

export function feededFileSystem() {
  return createFsInMemory({
    'assets/main.composite.json': JSON.stringify(mainComposite)
  })
}
