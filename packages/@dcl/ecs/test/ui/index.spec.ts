import { Engine } from '../../src/engine'
import { ui } from './ui'

describe('UI Mockup', () => {
  it('testing ui approach', () => {
    const engine = Engine()
    const jsxTree = ui()
    console.log('Tree:', JSON.stringify(ui(), null, 2))

    engine.renderUI(jsxTree)
  })
})
