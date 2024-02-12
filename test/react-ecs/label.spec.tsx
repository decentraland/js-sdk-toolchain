import { Entity, TextAlignMode, Font, IEngine } from '../../packages/@dcl/ecs'
import { components } from '../../packages/@dcl/ecs/src'
import { ReactEcs, Label, UiFontType, TextAlignType, scaleFontSize } from '../../packages/@dcl/react-ecs/src'
import { getScaleCtx } from '../../packages/@dcl/react-ecs/src/components/utils'
import { CANVAS_ROOT_ENTITY } from '../../packages/@dcl/react-ecs/src/components/uiTransform'
import { Color4 } from '../../packages/@dcl/sdk/math'
import { setupEngine } from './utils'
import { getFontSize } from '../../packages/@dcl/react-ecs/src/components/Label/utils'

describe('UiText React Ecs', () => {
  it('should generate a UI and update the width of a div', async () => {
    const { engine, uiRenderer } = setupEngine()
    const UiTransform = components.UiTransform(engine)
    const UiText = components.UiText(engine)
    const entityIndex = engine.addEntity() as number

    // Helpers
    const rootDivEntity = (entityIndex + 1) as Entity
    const getUiTransform = (entity: Entity) => UiTransform.get(entity)
    const getText = (entity: Entity) => UiText.get(entity)
    let text = 'CASLA'
    let color: Color4 | undefined = undefined
    let font: UiFontType | undefined = 'sans-serif'
    let textAlign: TextAlignType | undefined = 'bottom-center'
    const ui = () => <Label uiTransform={{ width: 100 }} value={text} color={color} font={font} textAlign={textAlign} />

    uiRenderer.setUiRenderer(ui)
    await engine.update(1)

    expect(getUiTransform(rootDivEntity)).toMatchObject({
      parent: CANVAS_ROOT_ENTITY,
      rightOf: 0,
      width: 100
    })

    expect(getText(rootDivEntity)).toMatchObject({
      value: 'CASLA',
      color: undefined,
      font: Font.F_SANS_SERIF,
      textAlign: TextAlignMode.TAM_BOTTOM_CENTER
    })

    // Update values
    text = 'BOEDO'
    color = { r: 1, g: 1, b: 1, a: 1 }
    font = undefined
    textAlign = undefined
    await engine.update(1)
    expect(getText(rootDivEntity)).toMatchObject({
      value: 'BOEDO',
      color: { r: 1, g: 1, b: 1, a: 1 },
      font: 0,
      textAlign: undefined
    })
    await engine.update(1)
  })

  describe('scaleFontSize', () => {
    const scaleCtx = {
      height: 600,
      width: 800,
      ratio: 2
    }

    it('should return the same font size when canvas information is not available', () => {
      expect(scaleFontSize(16, undefined, undefined)).toBe(16)
    })

    it('should scale font size using viewport width by default', () => {
      expect(scaleFontSize(16, undefined, scaleCtx)).toBeCloseTo(17.56)
    })

    it('should scale font size using viewport height when scale unit is "vh"', () => {
      expect(scaleFontSize(16, '10vh', scaleCtx)).toBeCloseTo(46)
    })

    it('should scale font size correctly when scale unit is "vw"', () => {
      expect(scaleFontSize(16, '10vw', scaleCtx)).toBeCloseTo(56)
    })

    it('should handle scaling with a numeric value', () => {
      expect(scaleFontSize(16, 10, scaleCtx)).toBeCloseTo(56)
    })

    it('should handle scaling with a numeric value and unit "vw"', () => {
      expect(scaleFontSize(16, '10.5vw', scaleCtx)).toBeCloseTo(58)
    })
  })

  describe('getScaleCtx', () => {
    it('should return undefined when "UiCanvasInformation" component is not found', () => {
      const engine = {
        getComponent: () => ({
          getOrNull: () => null
        })
      } as any as IEngine

      expect(getScaleCtx(engine)).toBe(undefined)
    })

    it('should return props when "UiCanvasInformation" component is found', () => {
      const canvasProps = { width: 10, height: 10, devicePixelRatio: 1 }
      const engine = {
        getComponent: () => ({
          getOrNull: () => canvasProps
        })
      } as any as IEngine

      expect(getScaleCtx(engine)).toStrictEqual({ width: 10, height: 10, ratio: 1 })
    })
  })

  describe('getFontSize', () => {
    it('should return undefined if no value is provided', () => {
      expect(getFontSize(undefined)).toBe(undefined)
    })

    it('should return an updated value depending on viewport', () => {
      expect(getFontSize('10vw')).toStrictEqual({ fontSize: 10 })
    })

    it('should return the same value provided', () => {
      expect(getFontSize(10)).toStrictEqual({ fontSize: 10 })
    })
  })
})
