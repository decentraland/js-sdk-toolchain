import { Engine } from '../../src/engine'
import { ui } from './ui'
import { render } from '../jsx'

describe('UI Mockup', () => {
  it('testing ui approach', () => {
    const engine = Engine()
    const jsxTree = ui()
    console.log('Tree:', JSON.stringify(ui(), null, 2))

    render(engine)(jsxTree)
  })
})
