import {
  YGDisplay,
  PBUiTransform,
  YGJustify,
  YGAlign
} from '../src/components/generated/pb/UiTransform.gen'
import { PBUiText } from '../src/components/generated/pb/UiText.gen'
import { Engine, Entity } from '../src/engine'
import { ui } from './jsx/ui'

type DivOpts = Partial<Omit<PBUiTransform, 'parent'>>
type TextOpts = Partial<Omit<PBUiText, 'text'>>

type Component = (parent: Entity) => Entity

const divDefaults: Required<DivOpts> = {
  display: YGDisplay.YGDisplayFlex,
  justifyContent: YGJustify.UNRECOGNIZED,
  alignItems: YGAlign.YGAlignAuto
}

const html: string[] = []

describe('UI Mockup', () => {
  it('testing ui approach', () => {
    const engine = Engine()
    const { UiText, UiTransform } = engine.baseComponents
    function Text(value: string, opts: TextOpts = {}) {
      return (parentEntity: Entity) => {
        const entity = engine.addEntity()
        html.push(`<div entity=${entity} parent=${parentEntity} text>`)
        html.push(`<text entity=${entity} parent=${parentEntity}>`)
        html.push(value)
        UiTransform.create(entity, {
          ...divDefaults,
          parent: parentEntity
        })
        UiText.create(entity, {
          ...opts,
          text: value
        })
        html.push('</text>')
        html.push('</div>')
        return entity
      }
    }

    function Div(opts: DivOpts = {}, ...components: Component[]) {
      return (parentEntity?: Entity) => {
        const entity = engine.addEntity()
        const divProps = {
          ...divDefaults,
          ...opts
        }
        html.push(
          `<div entity=${entity} parent=${parentEntity}> style={${JSON.stringify(
            divProps,
            null,
            2
          )}}`
        )
        UiTransform.create(entity, {
          ...divProps,
          parent: parentEntity || 0
        })
        for (const component of components || []) {
          component(entity)
        }
        html.push('</div>')
        return entity
      }
    }

    function RootDiv(opts: DivOpts = {}, ...components: Component[]) {
      return Div(opts, ...components)()
    }

    RootDiv(
      { display: YGDisplay.YGDisplayFlex },
      Text('Hola'),
      Text('hola2'),
      Div(
        { display: YGDisplay.YGDisplayNone },
        Text('div1'),
        Div({}, Text('div11'))
      ),
      Div({ display: YGDisplay.YGDisplayFlex }, Text('chau2'))
    )

    // console.log(html.join('\n'))
    console.log('ui:', JSON.stringify(ui(), null, 2))
  })
})
