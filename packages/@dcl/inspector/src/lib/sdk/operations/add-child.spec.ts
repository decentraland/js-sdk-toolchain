import { Engine, Entity, IEngine } from '@dcl/ecs'

import addChild, { generateUniqueName, getSuffixDigits } from './add-child'
import { createComponents, createEditorComponents, SdkComponents } from '../components'

describe('generateUniqueName', () => {
  let engine: IEngine
  let Name: SdkComponents['Name']
  let _addChild: (parent: Entity, name: string) => Entity

  beforeEach(() => {
    engine = Engine()
    const coreComponents = createComponents(engine)
    createEditorComponents(engine)
    Name = coreComponents.Name
    _addChild = addChild(engine)
  })

  it('should return the base name when there are no existing nodes', () => {
    const result = generateUniqueName(engine, Name, 'SomeName')

    expect(result).toBe('SomeName')
  })

  it('should return the base name with _1 when the base name already exists', () => {
    _addChild(engine.RootEntity, 'SomeName')

    const result = generateUniqueName(engine, Name, 'SomeName')

    expect(result).toBe('SomeName_1')
  })

  it('should return the base name with the next incremented suffix', () => {
    _addChild(engine.RootEntity, 'SomeName')
    _addChild(engine.RootEntity, 'SomeName_1')
    _addChild(engine.RootEntity, 'SomeName_2')

    const result = generateUniqueName(engine, Name, 'SomeName')

    expect(result).toBe('SomeName_3')
  })

  it('should not match names with multiple underscore-separated numbers', () => {
    _addChild(engine.RootEntity, 'SomeName_123_1')

    const result = generateUniqueName(engine, Name, 'SomeName')

    expect(result).toBe('SomeName')
  })

  it('should handle mixed case names correctly', () => {
    _addChild(engine.RootEntity, 'someName')
    _addChild(engine.RootEntity, 'SomeName_1')

    const result = generateUniqueName(engine, Name, 'SomeName')

    expect(result).toBe('SomeName_2')
  })

  it('should return the base name with _1 when the base name exists in mixed case', () => {
    _addChild(engine.RootEntity, 'SomeName')
    _addChild(engine.RootEntity, 'SOMENAME_1')

    const result = generateUniqueName(engine, Name, 'SomeName')

    expect(result).toBe('SomeName_2')
  })

  it('should handle names with an underscore and valid digits', () => {
    _addChild(engine.RootEntity, 'SomeName_1')
    _addChild(engine.RootEntity, 'SomeName_2')
    _addChild(engine.RootEntity, 'SomeName_3')

    const result = generateUniqueName(engine, Name, 'SomeName')

    expect(result).toBe('SomeName_4')
  })

  it('should handle names with only digits after underscore', () => {
    _addChild(engine.RootEntity, 'SomeName')
    _addChild(engine.RootEntity, 'SomeName_10')

    const result = generateUniqueName(engine, Name, 'SomeName')

    expect(result).toBe('SomeName_11')
  })

  it('should handle names with no digits after underscore', () => {
    _addChild(engine.RootEntity, 'SomeName_')

    const result = generateUniqueName(engine, Name, 'SomeName')

    expect(result).toBe('SomeName')
  })
})

describe('getSuffixDigits', () => {
  it('should return -1 if there is no underscore', () => {
    expect(getSuffixDigits('SomeName')).toBe(-1)
  })

  it('should return -1 if the string ends with an underscore', () => {
    expect(getSuffixDigits('SomeName_')).toBe(-1)
  })

  it('should return the digits after the last underscore if they are valid numbers', () => {
    expect(getSuffixDigits('SomeName_123')).toBe(123)
  })

  it('should return -1 if the part after the last underscore is not a valid number', () => {
    expect(getSuffixDigits('SomeName_abc')).toBe(-1)
  })

  it('should return -1 if there is only one underscore without digits', () => {
    expect(getSuffixDigits('SomeName_')).toBe(-1)
  })

  it('should return the correct number for multiple underscores with valid digits at the end', () => {
    expect(getSuffixDigits('SomeName_1_2_3')).toBe(3)
  })

  it('should return -1 if there are multiple underscores and the last part is not a valid number', () => {
    expect(getSuffixDigits('SomeName_1_2_abc')).toBe(-1)
  })

  it('should return -1 for an empty string', () => {
    expect(getSuffixDigits('')).toBe(-1)
  })

  it('should return -1 if the string is just an underscore', () => {
    expect(getSuffixDigits('_')).toBe(-1)
  })

  it('should return -1 if there are no digits after the underscore', () => {
    expect(getSuffixDigits('SomeName_')).toBe(-1)
  })

  it('should handle strings with digits but no underscore correctly', () => {
    expect(getSuffixDigits('123')).toBe(-1)
  })

  it('should return -1 if there are multiple underscores with no digits after the last underscore', () => {
    expect(getSuffixDigits('SomeName_1_')).toBe(-1)
  })
})
