import { Entity, IEngine, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'
import removeComponent from './remove-component'

describe('removeComponent', () => {
  let engine: IEngine
  const getComponentMock = jest.fn()
  beforeEach(() => {
    engine = {
      getComponent: getComponentMock
    } as unknown as IEngine
  })
  afterEach(() => {
    getComponentMock.mockReset()
  })
  describe('When creating the removeComponent operation', () => {
    it('should return a function', () => {
      const removeComponentOperation = removeComponent(engine)
      expect(removeComponentOperation).toBeInstanceOf(Function)
    })
    describe('and then passing the entity and the component id to the removeComponent operation', () => {
      let entity: Entity
      let removeComponentOperation: ReturnType<typeof removeComponent>
      const deleteFromMock = jest.fn()
      const component = {
        deleteFrom: deleteFromMock
      } as unknown as LastWriteWinElementSetComponentDefinition<unknown>
      beforeEach(() => {
        entity = 0 as Entity
        removeComponentOperation = removeComponent(engine)
      })
      afterEach(() => {
        deleteFromMock.mockReset()
      })
      it('should remove the component to the entity', () => {
        removeComponentOperation(entity, component)
        expect(deleteFromMock).toHaveBeenCalledWith(entity)
      })
    })
  })
})
