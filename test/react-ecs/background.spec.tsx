import {
  Engine,
  IEngine,
  Entity,
  createPointerEventSystem,
  createInputSystem
} from '../../packages/@dcl/ecs'
import { components, IEngine as IIEngine } from '../../packages/@dcl/ecs/src'
import { Color4 } from '../../packages/@dcl/sdk/math'
import {
  ReactEcs,
  UiEntity,
  createReactBasedUiSystem,
  ReactBasedUiSystem,
  CANVAS_ROOT_ENTITY,
  UiBackgroundProps
} from '../../packages/@dcl/react-ecs/src'

describe('UiBackground React Ecs', () => {
  let engine: IEngine
  let uiRenderer: ReactBasedUiSystem

  beforeEach(() => {
    engine = Engine()
    uiRenderer = createReactBasedUiSystem(
      engine,
      createPointerEventSystem(engine, createInputSystem(engine))
    )
  })

  it('should generate a UI and update the width of a div', async () => {
    const UiTransform = components.UiTransform(engine as IIEngine)
    const UiBackground = components.UiBackground(engine as IIEngine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const getBackground = (entity: Entity) => UiBackground.get(entity)
    let color: Color4.Mutable | undefined = { r: 0, g: 1, b: 2, a: 0 }

    const ui = () => (
      <UiEntity uiTransform={{ width: 100 }} uiBackground={{ color }} />
    )

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 100
    })

    expect(getBackground(rootDivEntity)).toMatchObject({
      color: { r: 0, g: 1, b: 2, a: 0 }
    })

    // Update values
    color.g = 20.8

    await engine.update(1)
    expect(getBackground(rootDivEntity)).toMatchObject({
      color: { r: 0, g: 20.8, b: 2 }
    })

    color = undefined
    await engine.update(1)
    expect(getBackground(rootDivEntity)).toMatchObject({
      color: undefined
    })
  })

  it('should remove backgrund component', async () => {
    const UiBackground = components.UiBackground(engine as IIEngine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getBackground = () => UiBackground.getOrNull(rootDivEntity)
    let backgroundProps: { uiBackground: UiBackgroundProps } | undefined = {
      uiBackground: {
        color: { r: 0, g: 1, b: 2, a: 0 },
        textureMode: 'center',
        uvs: []
      }
    }

    const ui = () => (
      <UiEntity uiTransform={{ width: 100 }} {...backgroundProps} />
    )

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getBackground()?.color).toMatchObject(
      backgroundProps.uiBackground.color!
    )

    backgroundProps = undefined
    await engine.update(1)
    expect(getBackground()).toBe(null)
  })

  it('Texture background', async () => {
    const UiBackground = components.UiBackground(engine as IIEngine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getBackground = () => UiBackground.getOrNull(rootDivEntity)
    let backgroundProps: { uiBackground: UiBackgroundProps } | undefined = {
      uiBackground: {
        color: { r: 0, g: 1, b: 2, a: 0 },
        textureMode: 'center',
        uvs: [],
        texture: {
          src: 'boedo-src'
        }
      }
    }

    const ui = () => (
      <UiEntity uiTransform={{ width: 100 }} {...backgroundProps} />
    )

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getBackground()?.color).toMatchObject(
      backgroundProps.uiBackground.color!
    )
    expect(getBackground()?.texture).toMatchObject({
      tex: {
        $case: 'texture',
        texture: {
          src: 'boedo-src'
        }
      }
    })

    backgroundProps = {
      uiBackground: {
        avatarTexture: {
          userId: 'casla-user-id'
        }
      }
    }
    await engine.update(1)
    expect(getBackground()?.texture).toMatchObject({
      tex: {
        $case: 'avatarTexture',
        avatarTexture: {
          userId: 'casla-user-id'
        }
      }
    })
  })
})
