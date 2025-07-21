import { TextEncoder, TextDecoder } from 'util'

Object.assign(global, { TextDecoder, TextEncoder })

// Mock DynamicTexture to prevent canvas context errors in tests
jest.mock('@babylonjs/core', () => {
  const originalModule = jest.requireActual('@babylonjs/core')
  return {
    ...originalModule,
    DynamicTexture: jest.fn().mockImplementation(() => ({
      getContext: jest.fn().mockReturnValue({
        fillStyle: '#000000',
        fillRect: jest.fn()
      }),
      update: jest.fn()
    }))
  }
})
