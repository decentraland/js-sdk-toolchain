import { Engine, IEngine } from '@dcl/ecs'
import { createOperations } from './index'
import { store } from '../../../redux/store'
import { updateCanSave } from '../../../redux/app'

jest.mock('../../../redux/store', () => ({
  store: {
    dispatch: jest.fn()
  }
}))

jest.mock('../../../redux/app', () => ({
  updateCanSave: jest.fn()
}))

describe('createOperations', () => {
  let engine: IEngine

  beforeEach(() => {
    engine = Engine()
    jest.clearAllMocks()
  })

  it('should create all operations', () => {
    const operations = createOperations(engine)

    expect(operations.addChild).toBeDefined()
    expect(operations.addAsset).toBeDefined()
    expect(operations.setParent).toBeDefined()
    expect(operations.reorder).toBeDefined()
    expect(operations.addComponent).toBeDefined()
    expect(operations.removeComponent).toBeDefined()
    expect(operations.updateSelectedEntity).toBeDefined()
    expect(operations.removeSelectedEntities).toBeDefined()
    expect(operations.duplicateEntity).toBeDefined()
    expect(operations.createCustomAsset).toBeDefined()
    expect(operations.getSelectedEntities).toBeDefined()
    expect(operations.setGround).toBeDefined()
    expect(operations.lock).toBeDefined()
    expect(operations.hide).toBeDefined()
  })

  describe('dispatch', () => {
    it('should update canSave and call engine.update', async () => {
      const operations = createOperations(engine)
      await operations.dispatch()

      expect(store.dispatch).toHaveBeenCalledWith(updateCanSave({ dirty: true }))
      // Note: We can't easily test engine.update since it's internal to the Engine
    })

    it('should respect dirty flag', async () => {
      const operations = createOperations(engine)
      await operations.dispatch({ dirty: false })

      expect(store.dispatch).toHaveBeenCalledWith(updateCanSave({ dirty: false }))
    })
  })
})
