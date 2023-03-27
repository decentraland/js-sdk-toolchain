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
        },
        '513': {
          $case: 'json',
          json: {
            position: {
              x: 4,
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
      name: 'core::GltfContainer',
      data: {
        '513': {
          $case: 'json',
          json: {
            src: 'assets/models/test-glb.glb'
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

const builderMappings: Record<string, string> = {
  'assets/models/test-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB'
}

export async function feededFileSystem() {
  const fileContent: Record<string, Buffer> = {}

  await Promise.all(
    Object.entries(builderMappings).map(async ([path, contentHash]) => {
      try {
        const url = `https://builder-api.decentraland.org/v1/storage/contents/${contentHash}`
        const content = await (await fetch(url)).arrayBuffer()
        fileContent[path] = Buffer.from(content)
      } catch (err) {
        console.error('Error fetching an asset for feed in-memory storage ' + path)
      }
    })
  )

  return createFsInMemory({
    ...fileContent,
    './assets/main.composite.json': Buffer.from(JSON.stringify(mainComposite), 'utf-8')
  })
}
