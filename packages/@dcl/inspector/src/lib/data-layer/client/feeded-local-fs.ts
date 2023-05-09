import { createFsInMemory } from '../../logic/in-memory-storage'

export const minimalComposite = {
  version: 1,
  components: [
    {
      name: 'core::Transform',
      data: {
        '512': {
          $case: 'json',
          json: {
            position: {
              x: 8,
              y: 1,
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
      name: 'inspector::Scene',
      jsonSchema: {
        type: 'object',
        properties: {
          layout: {
            type: 'object',
            properties: {
              base: {
                type: 'object',
                properties: {
                  x: {
                    type: 'integer'
                  },
                  y: {
                    type: 'integer'
                  }
                }
              },
              parcels: {
                type: 'array',
                item: {
                  type: 'object',
                  properties: {
                    x: {
                      type: 'integer'
                    },
                    y: {
                      type: 'integer'
                    }
                  }
                }
              }
            }
          }
        },
        serializationType: 'map'
      },
      data: {
        '0': {
          $case: 'json',
          json: {
            layout: {
              base: {
                x: 0,
                y: 0
              },
              parcels: [
                {
                  x: 0,
                  y: 0
                }
              ]
            }
          }
        }
      }
    }
  ]
}

export const mainComposite = {
  version: 1,
  components: [
    {
      name: 'core::Transform',
      data: {
        '512': {
          $case: 'json',
          json: {
            position: {
              x: 8,
              y: 1,
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
    },
    {
      name: 'inspector::Scene',
      jsonSchema: {
        type: 'object',
        properties: {
          layout: {
            type: 'object',
            properties: {
              base: {
                type: 'object',
                properties: {
                  x: {
                    type: 'integer'
                  },
                  y: {
                    type: 'integer'
                  }
                }
              },
              parcels: {
                type: 'array',
                item: {
                  type: 'object',
                  properties: {
                    x: {
                      type: 'integer'
                    },
                    y: {
                      type: 'integer'
                    }
                  }
                }
              }
            }
          }
        },
        serializationType: 'map'
      },
      data: {
        '0': {
          $case: 'json',
          json: {
            layout: {
              base: {
                x: 0,
                y: 0
              },
              parcels: [
                {
                  x: 0,
                  y: 0
                },
                {
                  x: 0,
                  y: 1
                },
                {
                  x: 1,
                  y: 0
                }
              ]
            }
          }
        }
      }
    }
  ]
}

const builderMappings: Record<string, string> = {
  'assets/models/test-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB',
  'assets/models2/test2-glb.glb': 'QmWtwaLMbfMioQCshdqwnuRCzZAz6nnAWARvZKnqfnu4LB'
}

export async function feededFileSystem(mappings: Record<string, string> = builderMappings) {
  const fileContent: Record<string, Buffer> = {}

  async function downloadAndAssignAsset([path, contentHash]: [string, string]) {
    try {
      const url = `https://builder-api.decentraland.org/v1/storage/contents/${contentHash}`
      const request = await fetch(url)
      const content = await request.arrayBuffer()
      fileContent[path] = Buffer.from(content)
    } catch (err) {
      console.error('Error fetching an asset for feed in-memory storage ' + path)
    }
  }

  const assetPromises = Object.entries(mappings).map(downloadAndAssignAsset)
  await Promise.all(assetPromises)

  return createFsInMemory({
    ...fileContent,
    'main.composite': Buffer.from(JSON.stringify(mainComposite), 'utf-8')
  })
}
