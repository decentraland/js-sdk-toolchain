import { Engine } from '../../src/engine'
import {Color} from "../../dist/components/generated/pb/TextShape";

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
      font_Size: 5,
      font_autoSize: true,
      h_text_align: 'horizontal',
      v_text_align: 'vertical',
      width: 100,
      height: 100,
      padding_top: 11,
      padding_right: 12,
      padding_bottom: 13,
      padding_left: 14,
      line_spacing: 15,
      line_count: 16,
      text_wrapping: true,
      shadow_blur: 18,
      shadow_offsetX: 19,
      shadow_offsetY: 20,
      outline_width: 21,
      shadow_color: { red:1, green:1, blue:1 },
      outline_color: { red:1, green:1, blue:1 },
      text_color: { red:1, green:1, blue:1 },
    })

    TextShape.create(entityB, {
      text: 'false',
      visible: false,
      font: 'false',
      opacity: 0,
      font_Size: 15,
      font_autoSize: false,
      h_text_align: 'vertical',
      v_text_align: 'horizontal',
      width: 200,
      height: 200,
      padding_top: 211,
      padding_right: 212,
      padding_bottom: 213,
      padding_left: 214,
      line_spacing: 215,
      line_count: 216,
      text_wrapping: false,
      shadow_blur: 218,
      shadow_offsetX: 219,
      shadow_offsetY: 220,
      outline_width: 221,
      shadow_color: { red:1, green:1, blue:1 },
      outline_color: { red:1, green:1, blue:1 },
      text_color: { red:1, green:1, blue:1 },
    })
    const buffer = TextShape.toBinary(entity)
    TextShape.updateFromBinary(entityB, buffer)

    expect(_textShape).toBeDeepCloseTo({ ...TextShape.mutable(entityB) })
  })
})
