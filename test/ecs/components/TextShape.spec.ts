import { Engine, components, Font, TextAlignMode } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated TextShape ProtoBuf', () => {
  it('should serialize/deserialize TextShape', () => {
    const newEngine = Engine()
    const TextShape = components.TextShape(newEngine)

    testComponentSerialization(TextShape, {
      text: 'true',
      font: Font.F_SANS_SERIF,
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

    testComponentSerialization(TextShape, {
      font: undefined,
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
  })
})
