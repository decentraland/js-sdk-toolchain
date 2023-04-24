import * as dnd from './drag-drop'

describe('sdk drag and drop', () => {
  it('should return true when identifier equals type', () => {
    const drop = { value: 'project-asset-gltf', context: { tree: new Map() } }
    expect(dnd.isDropType(drop, 'project-asset-gltf', 'project-asset-gltf')).toBe(true)
    expect(dnd.isDropType(drop, 'invalid', 'project-asset-gltf')).toBe(false)
  })
  it('should return all drop types list', () => {
    expect(dnd.DROP_TYPES).toStrictEqual(expect.arrayContaining(Object.values(dnd.DropTypesEnum)))
  })
})
