import { Entity, IEngine } from '../../packages/@dcl/ecs/src'
import { ReactBasedUiSystem } from '../../packages/@dcl/react-ecs/src/system'
import { ReactEcs, UiEntity } from '../../packages/@dcl/react-ecs/src'
import { setupEngine } from './utils'

describe('React ECS entity tracking', () => {
  describe('when an entity is unmounted before the renderer is destroyed', () => {
    let engine: IEngine
    let removeEntity: jest.SpyInstance
    let uiRenderer: ReactBasedUiSystem
    let unmountedEntity: Entity
    let visible: boolean

    beforeEach(async () => {
      const setup = setupEngine()
      engine = setup.engine
      uiRenderer = setup.uiRenderer
      removeEntity = jest.spyOn(engine, 'removeEntity')
      visible = true

      uiRenderer.setUiRenderer(() => (visible ? <UiEntity uiTransform={{ width: 1 }} /> : null))
      await engine.update(1)

      // Only the unmount removal is recorded from here on, so calls[0] is the entity under test.
      removeEntity.mockClear()
      visible = false
      await engine.update(1)
      unmountedEntity = removeEntity.mock.calls[0][0]

      uiRenderer.destroy()
    })

    afterEach(() => {
      removeEntity.mockRestore()
    })

    it('should not remove the unmounted entity again while destroying the renderer', () => {
      expect(removeEntity.mock.calls.filter(([entity]) => entity === unmountedEntity)).toHaveLength(1)
    })
  })
})
