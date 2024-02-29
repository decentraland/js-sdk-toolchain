import { Entity, IEngine } from '@dcl/ecs'
import addComponent from './add-component'

describe('addComponent', () => {
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
  describe('When creating the addComponent operation', () => {
    it('should return a function', () => {
      const addComponentOperation = addComponent(engine)
      expect(addComponentOperation).toBeInstanceOf(Function)
    })
    describe('and then passing the entity and the component id to the addComponent operation', () => {
      let entity: Entity
      let componentId: number
      let defaultValue: any
      let addComponentOperation: ReturnType<typeof addComponent>
      const createMock = jest.fn()
      const componentMock = {
        createOrReplace: jest.fn(),
        create: createMock
      } as unknown
      beforeEach(() => {
        entity = 0 as Entity
        componentId = 0
        addComponentOperation = addComponent(engine)
        getComponentMock.mockReturnValue(componentMock)
      })
      afterEach(() => {
        getComponentMock.mockReset()
        createMock.mockReset()
      })
      it('should add the component to the entity', () => {
        addComponentOperation(entity, componentId, defaultValue)
        expect(createMock).toHaveBeenCalledWith(entity, defaultValue)
      })
      describe('and the component is not an LWW component', () => {
        beforeEach(() => {
          getComponentMock.mockReturnValue({})
        })
        afterEach(() => {
          getComponentMock.mockReset()
        })
        it('should throw an error', () => {
          expect(() => addComponentOperation(entity, componentId, defaultValue)).toThrowError()
        })
      })
    })
  })
})
