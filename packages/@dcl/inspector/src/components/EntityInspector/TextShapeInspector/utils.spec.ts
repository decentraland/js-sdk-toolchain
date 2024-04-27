import { PBTextShape, TextAlignMode } from '@dcl/ecs'
import { fromTextShape, toTextShape, isValidInput } from './utils'
import { TextShapeInput } from './types'

describe('fromTextShape', () => {
  it('should convert PBTextShape to TextShapeInput', () => {
    const pbTextShape: PBTextShape = {
      text: 'Hello, World!',
      fontSize: 16,
      fontAutoSize: true,
      textAlign: TextAlignMode.TAM_MIDDLE_CENTER,
      paddingTop: 10,
      paddingRight: 20,
      paddingBottom: 15,
      paddingLeft: 5,
      outlineWidth: 1,
      lineSpacing: 200,
      lineCount: 3,
      outlineColor: { r: 1, b: 0, g: 0 },
      textColor: { r: 1, b: 0, g: 0, a: 1 }
    }

    const result: TextShapeInput = fromTextShape(pbTextShape)

    expect(result).toEqual({
      text: 'Hello, World!',
      fontSize: '16',
      fontAutoSize: true,
      textAlign: TextAlignMode.TAM_MIDDLE_CENTER.toString(),
      paddingTop: '10',
      paddingRight: '20',
      paddingBottom: '15',
      paddingLeft: '5',
      outlineWidth: '5',
      lineSpacing: '2',
      lineCount: '3',
      outlineColor: '#FF0000',
      textColor: '#FF0000'
    })
  })
})

describe('toTextShape', () => {
  it('should convert TextShapeInput to PBTextShape', () => {
    const textShapeInput: TextShapeInput = {
      text: 'Hello, World!',
      fontSize: '16',
      fontAutoSize: true,
      textAlign: TextAlignMode.TAM_MIDDLE_CENTER.toString(),
      paddingTop: '10',
      paddingRight: '20',
      paddingBottom: '15',
      paddingLeft: '5',
      outlineWidth: '5',
      lineSpacing: '2',
      lineCount: '3',
      outlineColor: '#FF0000',
      textColor: '#FF0000'
    }

    const result: PBTextShape = toTextShape(textShapeInput)

    expect(result).toEqual({
      text: 'Hello, World!',
      fontSize: 16,
      fontAutoSize: true,
      textAlign: TextAlignMode.TAM_MIDDLE_CENTER,
      paddingTop: 10,
      paddingRight: 20,
      paddingBottom: 15,
      paddingLeft: 5,
      outlineWidth: 1,
      lineSpacing: 200,
      lineCount: 3,
      outlineColor: { r: 1, b: 0, g: 0 },
      textColor: { r: 1, b: 0, g: 0, a: 1 }
    })
  })
})

describe('isValidInput', () => {
  it('should return true', () => {
    const result = isValidInput()
    expect(result).toBe(true)
  })
})
