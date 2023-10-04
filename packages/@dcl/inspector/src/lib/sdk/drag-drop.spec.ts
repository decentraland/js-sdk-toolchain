import * as dnd from './drag-drop'

describe('sdk drag and drop', () => {
  it('should return true when identifier equals type', () => {
    const drop = { value: 'project-asset', context: { tree: new Map() } }
    expect(dnd.isDropType(drop, 'project-asset', 'project-asset')).toBe(true)
    expect(dnd.isDropType(drop, 'invalid', 'project-asset')).toBe(false)
  })
  it('should return all drop types list', () => {
    expect(dnd.DROP_TYPES).toStrictEqual(expect.arrayContaining(Object.values(dnd.DropTypesEnum)))
  })
})
