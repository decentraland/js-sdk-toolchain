import * as dnd from './drag-drop'

describe('sdk drag and drop', () => {
  it('should return true when identifier equals type', () => {
    const drop = { value: 'local-asset', context: { tree: new Map() } }
    expect(dnd.isDropType(drop, 'local-asset', 'local-asset')).toBe(true)
    expect(dnd.isDropType(drop, 'invalid', 'local-asset')).toBe(false)
  })
  it('should return all drop types list', () => {
    expect(dnd.DROP_TYPES).toStrictEqual(expect.arrayContaining(Object.values(dnd.DropTypesEnum)))
  })
})
