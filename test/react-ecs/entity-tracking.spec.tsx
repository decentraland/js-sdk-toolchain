import { IEngine } from '../../packages/@dcl/ecs/src'
import { ReactBasedUiSystem } from '../../packages/@dcl/react-ecs/src/system'
import { ReactEcs, UiEntity } from '../../packages/@dcl/react-ecs/src'
import { setupEngine } from './utils'

describe('React ECS entity tracking', () => {
  let engine: IEngine
  let removeEntity: jest.SpyInstance
  let uiRenderer: ReactBasedUiSystem
  let visible: boolean

  beforeEach(async () => {
    const setup = setupEngine()
    engine = setup.engine
    uiRenderer = setup.uiRenderer
    removeEntity = jest.spyOn(engine, 'removeEntity')
    visible = true

    uiRenderer.setUiRenderer(() => (visible ? <UiEntity uiTransform={{ width: 1 }} /> : null))
    await engine.update(1)

    visible = false
    await engine.update(1)
    uiRenderer.destroy()
  })

  afterEach(() => {
    removeEntity.mockRestore()
  })

  describe('when an entity is unmounted before the renderer is destroyed', () => {
    it('should remove the entity only during unmount', () => {
      expect(removeEntity).toHaveBeenCalledTimes(1)
    })
  })
})
