import { YGDisplay } from '../src/components/generated/pb/UiTransform.gen'
import { Engine, Entity } from '../src/engine'

type Opts = { display?: YGDisplay }
type TextOpts = { fontSize?: number }

type Div = (opts: Opts) => (parent?: Entity) => Entity
type Text = (opts: TextOpts) => (parent?: Entity) => Entity
type Component = ReturnType<Div | Text>

describe('UI Mockup', () => {
  it('testing ui approach', () => {
    const engine = Engine()
    function Text(value: string, _YGDisplayopts: TextOpts = {}) {
      return (parentEntity?: Entity) => {
        const entity = engine.addEntity()
        const text = engine.baseComponents.UiText.create(entity, {
          text: value
        })
        console.log('Text', value)
        return entity
      }
    }
    let index = 0
    function Div(opts: Opts = {}, ...components: Component[]) {
      return (parentEntity?: Entity) => {
        const entity = engine.addEntity()
        engine.baseComponents.UiTransform.create(entity).display =
          opts.display || YGDisplay.YGDisplayFlex
        console.log('div', index)
        index++
        for (const component of components || []) {
          component(entity)
        }
        return entity
      }
    }

    function RootDiv(opts: Opts = {}, ...components: Component[]) {
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
  })
})

// <RootDiv display="flex">
//   <text>'Hola1'<text>
//   <text>'Hola2'<text>
//   <div display="none">
//     <text>'div1'</div>
//     <div>
//       <text>div11</text>
//     </div>
//   </div>
// </RootDiv>
