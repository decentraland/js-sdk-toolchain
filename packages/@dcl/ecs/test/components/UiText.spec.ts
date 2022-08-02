import { Engine } from '../../src/engine'

describe('UiTransform component', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const { UiText } = newEngine.baseComponents
    const entity = newEngine.addEntity()

    UiText.create(entity, {
      text: 'Test Text',
      textColor: {r:0, g:0, b: 0}
    })

    const buffer = UiText.toBinary(entity)
    UiText.upsertFromBinary(entity, buffer)
    const entityB = newEngine.addEntity()
    expect(UiText.createOrReplace(entityB)).not.toBeDeepCloseTo({
      ...UiText.getFrom(entity)
    })
  })
})
