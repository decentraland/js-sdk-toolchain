import { CameraMode } from '../../src/components/generated/pb/CameraModeArea.gen'
import { ensureEngineAndComponents } from './utils'

describe('Generated CameraModifierArea ProtoBuf', () => {
  it('should serialize/deserialize CameraModifierArea', async () => {
    const {
      engine: newEngine,
      components: { CameraModeArea }
    } = await ensureEngineAndComponents()

    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const avatarModifierArea = CameraModeArea.create(entity, {
      area: { x: 1, y: 2, z: 3 },
      mode: CameraMode.FIRST_PERSON
    })

    CameraModeArea.create(entityB, {
      area: { x: 3, y: 4, z: 5 },
      mode: CameraMode.THIRD_PERSON
    })
    const buffer = CameraModeArea.toBinary(entity)
    CameraModeArea.updateFromBinary(entityB, buffer)

    expect(avatarModifierArea).toEqual({
      ...CameraModeArea.mutable(entityB)
    })

    expect(CameraModeArea.createOrReplace(entityB)).not.toEqual({
      ...CameraModeArea.mutable(entity)
    })
  })
})
