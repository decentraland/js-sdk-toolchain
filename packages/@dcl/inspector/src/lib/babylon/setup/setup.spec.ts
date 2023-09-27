import { NullEngine } from '@babylonjs/core/Engines/nullEngine'
import { Engine } from '@babylonjs/core'
import { setupEngine } from './setup'
import { mockXMLHttpRequest } from '../../../../test/utils'
import { getDefaultInspectorPreferences } from '../../logic/preferences/types'

describe('When setting up the engine', () => {
  let engine: Engine
  let resetMockXMLHttpRequest: () => void
  let canvas: HTMLCanvasElement

  beforeEach(() => {
    engine = new NullEngine()
    resetMockXMLHttpRequest = mockXMLHttpRequest()
    canvas = document.createElement('canvas')
  })

  afterEach(() => {
    engine.dispose()
    resetMockXMLHttpRequest()
  })

  it('should create a scene', () => {
    const { scene } = setupEngine(engine, canvas, getDefaultInspectorPreferences())
    expect(scene).toBeDefined()
  })
})
