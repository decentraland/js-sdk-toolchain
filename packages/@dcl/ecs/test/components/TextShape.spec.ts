import { Engine } from '../../src/engine'

describe('Generated BoxShape ProtoBuf', () => {
  it('should serialize/deserialize BoxShape', () => {
    const newEngine = Engine()
    const { TextShape } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _textShape = TextShape.create(entity, {
      text: 'true',
      visible: true,
      font: 'test',
      opacity: 1,
      fontSize: 5,
      fontAutoSize: true,
      hTextAlign: 'horizontal',
      vTextAlign: 'vertical',
      width: 100,
      height: 100,
      paddingTop: 11,
      paddingRight: 12,
      paddingBottom: 13,
      paddingLeft: 14,
      lineSpacing: 15,
      lineCount: 16,
      textWrapping: true,
      shadowBlur: 18,
      shadowOffsetX: 19,
      shadowOffsetY: 20,
      outlineWidth: 21,
      shadowColor: { r: 1, g: 1, b: 1 },
      outlineColor: { r: 1, g: 1, b: 1 },
      textColor: { r: 1, g: 1, b: 1 }
    })

    TextShape.create(entityB, {
      text: 'false',
      visible: false,
      font: 'false',
      opacity: 0,
      fontSize: 15,
      fontAutoSize: false,
      hTextAlign: 'vertical',
      vTextAlign: 'horizontal',
      width: 200,
      height: 200,
      paddingTop: 211,
      paddingRight: 212,
      paddingBottom: 213,
      paddingLeft: 214,
      lineSpacing: 215,
      lineCount: 216,
      textWrapping: false,
      shadowBlur: 218,
      shadowOffsetX: 219,
      shadowOffsetY: 220,
      outlineWidth: 221,
      shadowColor: { r: 1, g: 1, b: 1 },
      outlineColor: { r: 1, g: 1, b: 1 },
      textColor: { r: 1, g: 1, b: 1 }
    })
    const buffer = TextShape.toBinary(entity)
    TextShape.updateFromBinary(entityB, buffer)

    const otherTextShape = TextShape.getModifiable(entityB)
    expect(_textShape).toBeDeepCloseTo({
      ...(otherTextShape as any)
    })

    expect(TextShape.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...TextShape.get(entity)
    })
  })
})
