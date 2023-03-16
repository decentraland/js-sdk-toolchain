import { Entity, TextureWrapMode, TextureFilterMode } from '../../packages/@dcl/ecs/src'
import { components } from '../../packages/@dcl/ecs/src'
import { Color4 } from '../../packages/@dcl/sdk/math'
import { ReactEcs, UiEntity, UiBackgroundProps } from '../../packages/@dcl/react-ecs/src'
import { CANVAS_ROOT_ENTITY } from '../../packages/@dcl/react-ecs/src/components/uiTransform'
import { setupEngine } from './utils'

describe('UiBackground React Ecs', () => {
  it('should generate a UI and update the width of a div', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const UiBackground = components.UiBackground(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const getBackground = (entity: Entity) => UiBackground.get(entity)
    let color: Color4.Mutable | undefined = { r: 0, g: 1, b: 2, a: 0 }

    const ui = () => <UiEntity uiTransform={{ width: 100 }} uiBackground={{ color }} />

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
    const { engine, uiRenderer } = setupEngine()
    const UiBackground = components.UiBackground(engine)
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

    const ui = () => <UiEntity uiTransform={{ width: 100 }} {...backgroundProps} />

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getBackground()?.color).toMatchObject(backgroundProps.uiBackground.color!)

    backgroundProps = undefined
    await engine.update(1)
    expect(getBackground()).toBe(null)
  })

  it('Texture background', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiBackground = components.UiBackground(engine)
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
          src: 'boedo-src',
          wrapMode: 'clamp',
          filterMode: 'bi-linear'
        }
      }
    }

    const ui = () => <UiEntity uiTransform={{ width: 100 }} {...backgroundProps} />

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getBackground()?.color).toMatchObject(backgroundProps.uiBackground.color!)
    expect(getBackground()?.texture).toMatchObject({
      tex: {
        $case: 'texture',
        texture: {
          src: 'boedo-src',
          wrapMode: TextureWrapMode.TWM_CLAMP,
          filterMode: TextureFilterMode.TFM_BILINEAR
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

  it('should text undefined background', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiBackground = components.UiBackground(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getBackground = () => UiBackground.getOrNull(rootDivEntity)
    const ui = () => <UiEntity uiTransform={{ width: 100 }} uiBackground={{}} />

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)
    expect(getBackground()?.color).toBe(undefined)
  })
})
