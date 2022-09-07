import { Engine } from '../../../packages/@dcl/ecs/src/engine'

describe('@dcl/react-ecs', () => {
  it('should fail if there is no react-ecs exported globally', () => {
    const ui = () => {}
    const engine = Engine()
    expect(() => engine.renderUI(ui)).toThrowError('ReactEcs library not found')
  })
})
