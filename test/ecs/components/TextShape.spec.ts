import { Engine } from '../../../packages/@dcl/ecs/src/engine'
import {
  Font,
  TextAlignMode
} from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/common/texts.gen'

describe('Generated TextShape ProtoBuf', () => {
  it('should serialize/deserialize TextShape', () => {
    const newEngine = Engine()
    const { TextShape } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const _textShape = TextShape.create(entity, {
      text: 'true',
      font: Font.F_LIBERATION_SANS,
      textAlign: TextAlignMode.TAM_BOTTOM_CENTER,
      fontSize: 5,
      fontAutoSize: true,
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
      textColor: { r: 1, g: 1, b: 1, a: 1 }
    })

    TextShape.create(entityB, {
      text: 'false',
      fontSize: 15,
      fontAutoSize: false,
      textAlign: TextAlignMode.TAM_BOTTOM_CENTER,
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
      textColor: { r: 1, g: 1, b: 1, a: 1 }
    })
    const buffer = TextShape.toBinary(entity)
    TextShape.updateFromBinary(entityB, buffer)

    const otherTextShape = TextShape.getMutable(entityB)
    expect(_textShape).toBeDeepCloseTo({
      ...(otherTextShape as any)
    })

    expect(TextShape.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...TextShape.get(entity)
    })
  })
})
