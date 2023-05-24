import { Entity, IEngine } from '@dcl/ecs'
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
      let componentId: number
      let removeComponentOperation: ReturnType<typeof removeComponent>
      const deleteFromMock = jest.fn()
      const componentMock = {
        createOrReplace: jest.fn(),
        deleteFrom: deleteFromMock
      } as unknown
      beforeEach(() => {
        entity = 0 as Entity
        componentId = 0
        removeComponentOperation = removeComponent(engine)
        getComponentMock.mockReturnValue(componentMock)
      })
      afterEach(() => {
        getComponentMock.mockReset()
        deleteFromMock.mockReset()
      })
      it('should add the component to the entity', () => {
        removeComponentOperation(entity, componentId)
        expect(deleteFromMock).toHaveBeenCalledWith(entity)
      })
      describe('and the component is not an LWW component', () => {
        beforeEach(() => {
          getComponentMock.mockReturnValue({})
        })
        afterEach(() => {
          getComponentMock.mockReset()
        })
        it('should throw an error', () => {
          expect(() => removeComponentOperation(entity, componentId)).toThrowError()
        })
      })
    })
  })
})
