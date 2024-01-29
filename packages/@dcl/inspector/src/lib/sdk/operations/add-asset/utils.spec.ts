import { IEngine, PBMaterial, TextureUnion } from '@dcl/ecs'
import { isSelf, parseMaterial, parseTexture, parseSyncComponents } from './utils'

jest.mock('@dcl/ecs', () => ({
  IEngine: {
    getComponent: jest.fn()
  }
}))

describe('isSelf', () => {
  it('returns true for {self}', () => {
    const result = isSelf('{self}')
    expect(result).toBe(true)
  })

  it('returns false for other values', () => {
    const result = isSelf('not_self')
    expect(result).toBe(false)
  })
})

describe('parseTexture', () => {
  it('returns parsed texture with replaced assetPath', () => {
    const texture: TextureUnion = {
      tex: {
        $case: 'texture',
        texture: {
          src: '{assetPath}/image.jpg'
        }
      }
    }

    const result = parseTexture('base-path', texture)

    expect(result).toEqual({
      tex: {
        $case: 'texture',
        texture: {
          src: 'base-path/image.jpg'
        }
      }
    })
  })

  it('returns undefined for undefined texture', () => {
    const result = parseTexture('base-path', undefined)
    expect(result).toBeUndefined()
  })
})

describe('parseMaterial', () => {
  it('returns parsed material with parsed texture', () => {
    const base = 'base-path'
    const material: PBMaterial = {
      material: {
        $case: 'unlit',
        unlit: {
          texture: {
            tex: {
              $case: 'texture',
              texture: {
                src: '{assetPath}/image.jpg'
              }
            }
          }
        }
      }
    }

    const result = parseMaterial(base, material)

    expect(result).toEqual({
      material: {
        $case: 'unlit',
        unlit: {
          texture: {
            tex: {
              $case: 'texture',
              texture: {
                src: 'base-path/image.jpg'
              }
            }
          }
        }
      }
    })
  })

  it('returns unchanged material for unknown case', () => {
    const base = 'base-path'
    const material: any = {
      material: {
        $case: 'unknown_case'
      }
    }

    const result = parseMaterial(base, material)

    expect(result).toEqual(material)
  })
})

describe('parseSyncComponents', () => {
  it('returns component ids for existing components', () => {
    const componentNames = [
      {
        name: 'existingComponent1',
        componentId: 1
      },
      {
        name: 'existingComponent2',
        componentId: 2
      }
    ]

    const engineMock: IEngine = {
      getComponent: jest.fn((name: string) => componentNames.find(($) => $.name === name))
    } as any as IEngine

    const result = parseSyncComponents(
      engineMock,
      componentNames.map(($) => $.name)
    )

    expect(result).toEqual([1, 2])
  })

  it('skips non-existing components and logs error', () => {
    const componentNames = [
      {
        name: 'existingComponent1',
        componentId: 0
      }
    ]

    const engineMock: IEngine = {
      getComponent: jest.fn((name: string) => {
        const found = componentNames.find(($) => $.name === name)
        if (found) return found
        throw new Error('Component not found')
      })
    } as any as IEngine

    const result = parseSyncComponents(
      engineMock,
      componentNames.map(($) => $.name)
    )

    expect(result).toEqual([0])
  })
})
