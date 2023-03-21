import { createFsInMemory } from '../../logic/in-memory-storage'

const mainComposite = {
  id: 'main',
  components: [
    {
      name: 'core::Transform',
      data: {
        '512': {
          $case: 'json',
          json: {
            position: {
              x: 8,
              y: 0.8,
              z: 8
            }
          }
        }
      }
    },
    {
      name: 'core::MeshRenderer',
      data: {
        '512': {
          $case: 'json',
          json: {
            mesh: {
              $case: 'box',
              box: {
                uvs: []
              }
            }
          }
        }
      }
    },
    {
      name: 'core::MeshCollider',
      data: {
        '512': {
          $case: 'json',
          json: {
            mesh: {
              $case: 'box',
              box: {}
            }
          }
        }
      }
    },
    {
      name: 'cube-id',
      jsonSchema: {
        type: 'object',
        properties: {},
        serializationType: 'map'
      },
      data: {
        '512': {
          $case: 'json',
          json: {}
        }
      }
    },
    {
      name: 'core::PointerEvents',
      data: {
        '512': {
          $case: 'json',
          json: {
            pointerEvents: [
              {
                eventType: 1,
                eventInfo: {
                  button: 1,
                  hoverText: 'Press E to spawn',
                  maxDistance: 100,
                  showFeedback: true
                }
              }
            ]
          }
        }
      }
    },
    {
      name: 'core::Material',
      data: {
        '512': {
          $case: 'json',
          json: {
            material: {
              $case: 'pbr',
              pbr: {
                albedoColor: {
                  r: 1.0,
                  g: 0.85,
                  b: 0.42,
                  a: 1.0
                }
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
    'assets/main.composite.json': Buffer.from(JSON.stringify(mainComposite), 'utf-8')
  })
}
