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
            src: 'assets/models/flag.glb'
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
const genesisPlazaMappings: Record<string, string> = {
  'assets/models/flag.glb': 'bafkreihas5dhllg6cb7gyofmygawzk6met7zst5njizdenpaqsvhe3nf2u',
  'assets/models/Genesis_TX.png': 'bafkreid2aswbhebm5lwcjtsuwrrpz2jczgwvwavbelb22n7myftlhcpa4q',
  'assets/models/Texturas_A.png': 'bafybeihzu22c4msac7o5vvkczwjqrttjfmckml4fm7z5nrbmempqb55pdq'
}

export async function feededFileSystem() {
  const baseUrl = 'https://peer.decentraland.org/content/contents/'

  const genesisContent: Record<string, Buffer> = {}
  const genesisContentFetchPromises = Object.keys(genesisPlazaMappings).map(
    (path) =>
      new Promise<void>(async (resolve) => {
        try {
          const url = `${baseUrl}${genesisPlazaMappings[path]}`
          const content = await (await fetch(url)).arrayBuffer()
          genesisContent[path] = Buffer.from(content)
        } catch (err) {
          console.error('Error fetching an asset for feed in-memory storage ' + path)
        }
        resolve()
      })
  )

  await Promise.all(genesisContentFetchPromises)

  return createFsInMemory({
    ...genesisContent,
    './assets/main.composite.json': Buffer.from(JSON.stringify(mainComposite), 'utf-8')
  })
}
