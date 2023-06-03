import { initRenderer } from './init'
import { getDefaultInspectorPreferences } from '../../logic/preferences/types'

describe.only('When initing the engine', () => {
  it('should throw without a canvas', () => {
    expect(() => initRenderer(null as unknown as HTMLCanvasElement, getDefaultInspectorPreferences())).toThrow()
  })
})
