import {
  YGDisplay,
  PBUiTransform,
  YGJustify,
  YGAlign
} from '../../src/components/generated/pb/UiTransform.gen'
// import { PBUiText } from '../../src/components/generated/pb/UiText.gen'
import { Engine, Entity } from '../../src/engine'
import { ui } from './ui'

describe('UI Mockup', () => {
  it('testing ui approach', () => {
    const engine = Engine()
    // const { UiText, UiTransform } = engine.baseComponents


    // console.log(html.join('\n'))
    console.log('ui:', JSON.stringify(ui(), null, 2))
  })
})
