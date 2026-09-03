import { components } from '../../packages/@dcl/ecs/src'
import { Color4 } from '../../packages/@dcl/sdk/src/math'
import { Button, ReactEcs } from '../../packages/@dcl/react-ecs/src'
import { setupEngine, WHOLE_SCREEN } from './utils'

const RENDERED_FRAMES = 4

describe('when a disabled button is given colors the scene holds on to', () => {
  let engine: ReturnType<typeof setupEngine>['engine']
  let textColor: Color4
  let backgroundColor: Color4
  let UiText: ReturnType<typeof components.UiText>
  let UiBackground: ReturnType<typeof components.UiBackground>

  beforeEach(async () => {
    const setup = setupEngine()
    engine = setup.engine
    UiText = components.UiText(engine)
    UiBackground = components.UiBackground(engine)

    // Hoisted the way a scene keeps a palette around, rather than rebuilt per render.
    textColor = Color4.White()
    backgroundColor = Color4.Red()

    setup.uiRenderer.setUiRenderer(
      () => <Button value="press" disabled color={textColor} uiBackground={{ color: backgroundColor }} />,
      WHOLE_SCREEN
    )

    for (let frame = 0; frame < RENDERED_FRAMES; frame++) {
      await engine.update(1)
    }
  })

  it('should leave the text color the scene passed in untouched', () => {
    expect(textColor.a).toBe(1)
  })

  it('should leave the background color the scene passed in untouched', () => {
    expect(backgroundColor.a).toBe(1)
  })

  it('should keep dimming the text to the same alpha on every render', () => {
    const [, text] = Array.from(engine.getEntitiesWith(UiText))[0]

    expect(text.color?.a).toBe(0.5)
  })

  it('should keep dimming the background to the same alpha on every render', () => {
    const [, background] = Array.from(engine.getEntitiesWith(UiBackground))[0]

    expect(background.color?.a).toBe(0.5)
  })
})

describe('when a button that is not disabled is given colors', () => {
  let engine: ReturnType<typeof setupEngine>['engine']
  let textColor: Color4
  let UiText: ReturnType<typeof components.UiText>

  beforeEach(async () => {
    const setup = setupEngine()
    engine = setup.engine
    UiText = components.UiText(engine)
    textColor = Color4.White()

    setup.uiRenderer.setUiRenderer(() => <Button value="press" color={textColor} />, WHOLE_SCREEN)
    await engine.update(1)
  })

  it('should show them at full alpha', () => {
    const [, text] = Array.from(engine.getEntitiesWith(UiText))[0]

    expect(text.color?.a).toBe(1)
  })
})
