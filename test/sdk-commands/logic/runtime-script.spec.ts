jest.mock(
  '@dcl/inspector/node_modules/@dcl/asset-packs',
  () => ({
    getActionEvents: jest.fn((entity) => ({
      emit: jest.fn()
    }))
  }),
  { virtual: true }
)

import { runScripts } from '../../../packages/@dcl/sdk-commands/src/logic/runtime-script'
import { IEngine, Entity, EntityState } from '../../../packages/@dcl/ecs/dist-cjs'

describe('runtime-script', () => {
  let mockEngine: IEngine
  let addedSystems: Array<(dt: number) => void>

  beforeEach(() => {
    addedSystems = []
    mockEngine = {
      getEntityState: jest.fn(),
      addSystem: jest.fn((systemFn) => {
        addedSystems.push(systemFn)
      })
    } as unknown as IEngine
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('runScripts', () => {
    it('should not execute when there are no scripts', () => {
      const scripts: any[] = []

      runScripts(mockEngine, scripts)

      // No systems should be added when there are no scripts
      expect(mockEngine.addSystem).not.toHaveBeenCalled()
      expect(addedSystems.length).toBe(0)
    })

    it('should not execute start() when there are no scripts', () => {
      const scripts: any[] = []
      const startSpy = jest.fn()

      runScripts(mockEngine, scripts)

      // start() should never be called
      expect(startSpy).not.toHaveBeenCalled()
    })

    describe('functional scripts', () => {
      it('should execute start() for functional scripts', () => {
        const entity = 512 as Entity
        const startSpy = jest.fn()
        const updateSpy = jest.fn()

        ;(mockEngine.getEntityState as jest.Mock).mockReturnValue(EntityState.UsedEntity)

        const scripts = [
          {
            entity,
            path: 'test-script.ts',
            priority: 0,
            module: {
              start: startSpy,
              update: updateSpy
            }
          }
        ]

        runScripts(mockEngine, scripts)

        expect(startSpy).toHaveBeenCalledWith('', entity)
        expect(mockEngine.addSystem).toHaveBeenCalledWith(expect.any(Function), 0)
      })

      it('should execute update() for functional scripts on engine update', () => {
        const entity = 512 as Entity
        const startSpy = jest.fn()
        const updateSpy = jest.fn()

        ;(mockEngine.getEntityState as jest.Mock).mockReturnValue(EntityState.UsedEntity)

        const scripts = [
          {
            entity,
            path: 'test-script.ts',
            priority: 0,
            module: {
              start: startSpy,
              update: updateSpy
            }
          }
        ]

        runScripts(mockEngine, scripts)

        // Simulate engine update
        const dt = 0.016
        addedSystems[0](dt)

        expect(updateSpy).toHaveBeenCalledWith('', entity, dt)
      })

      it('should pass params to functional scripts', () => {
        const entity = 512 as Entity
        const startSpy = jest.fn()
        const params = { speed: { value: 10 }, color: { value: 'red' } }

        ;(mockEngine.getEntityState as jest.Mock).mockReturnValue(EntityState.UsedEntity)

        const scripts = [
          {
            entity,
            path: 'test-script.ts',
            priority: 0,
            layout: JSON.stringify({ params }),
            module: {
              start: startSpy
            }
          }
        ]

        runScripts(mockEngine, scripts)

        expect(startSpy).toHaveBeenCalledWith('', entity, 10, 'red')
      })

      it('should not execute scripts for removed entities', () => {
        const entity = 512 as Entity
        const startSpy = jest.fn()

        ;(mockEngine.getEntityState as jest.Mock).mockReturnValue(EntityState.Removed)

        const scripts = [
          {
            entity,
            path: 'test-script.ts',
            priority: 0,
            module: {
              start: startSpy
            }
          }
        ]

        runScripts(mockEngine, scripts)

        expect(startSpy).not.toHaveBeenCalled()
        // System should still be added, even if entities are removed
        expect(mockEngine.addSystem).toHaveBeenCalled()
      })

      it('should not call update() for removed entities', () => {
        const entity = 512 as Entity
        const updateSpy = jest.fn()

        // Entity is valid during start, but removed during update
        ;(mockEngine.getEntityState as jest.Mock)
          .mockReturnValueOnce(EntityState.UsedEntity)
          .mockReturnValue(EntityState.Removed)

        const scripts = [
          {
            entity,
            path: 'test-script.ts',
            priority: 0,
            module: {
              start: jest.fn(),
              update: updateSpy
            }
          }
        ]

        runScripts(mockEngine, scripts)

        // Simulate engine update
        addedSystems[0](0.016)

        expect(updateSpy).not.toHaveBeenCalled()
      })
    })

    describe('class-based scripts', () => {
      it('should instantiate and call start() for class-based scripts', () => {
        const entity = 512 as Entity
        const startSpy = jest.fn()

        class TestScript {
          start = startSpy
          constructor(public src: string, public entity: Entity) {}
        }

        ;(mockEngine.getEntityState as jest.Mock).mockReturnValue(EntityState.UsedEntity)

        const scripts = [
          {
            entity,
            path: 'test-script.ts',
            priority: 0,
            module: {
              TestScript
            }
          }
        ]

        runScripts(mockEngine, scripts)

        expect(startSpy).toHaveBeenCalled()
        expect(mockEngine.addSystem).toHaveBeenCalledWith(expect.any(Function), 0)
      })

      it('should call update() for class-based scripts on engine update', () => {
        const entity = 512 as Entity
        const updateSpy = jest.fn()

        class TestScript {
          update = updateSpy
          constructor(public src: string, public entity: Entity) {}
        }

        ;(mockEngine.getEntityState as jest.Mock).mockReturnValue(EntityState.UsedEntity)

        const scripts = [
          {
            entity,
            path: 'test-script.ts',
            priority: 0,
            module: {
              TestScript
            }
          }
        ]

        runScripts(mockEngine, scripts)

        // Simulate engine update
        const dt = 0.016
        addedSystems[0](dt)

        expect(updateSpy).toHaveBeenCalledWith(dt)
      })

      it('should pass params to class-based scripts constructor', () => {
        const entity = 512 as Entity
        const constructorSpy = jest.fn()
        const params = { speed: { value: 10 }, color: { value: 'red' } }

        class TestScript {
          constructor(src: string, entity: Entity, ...args: any[]) {
            constructorSpy(src, entity, ...args)
          }
        }

        ;(mockEngine.getEntityState as jest.Mock).mockReturnValue(EntityState.UsedEntity)

        const scripts = [
          {
            entity,
            path: 'test-script.ts',
            priority: 0,
            layout: JSON.stringify({ params }),
            module: {
              TestScript
            }
          }
        ]

        runScripts(mockEngine, scripts)

        expect(constructorSpy).toHaveBeenCalledWith('', entity, 10, 'red')
      })
    })

    describe('script priorities', () => {
      it('should add systems with correct priority', () => {
        const entity = 512 as Entity

        ;(mockEngine.getEntityState as jest.Mock).mockReturnValue(EntityState.UsedEntity)

        const scripts = [
          {
            entity,
            path: 'high-priority.ts',
            priority: 100,
            module: { start: jest.fn() }
          },
          {
            entity,
            path: 'low-priority.ts',
            priority: 1,
            module: { start: jest.fn() }
          }
        ]

        runScripts(mockEngine, scripts)

        expect(mockEngine.addSystem).toHaveBeenCalledTimes(2)
        expect(mockEngine.addSystem).toHaveBeenCalledWith(expect.any(Function), 100)
        expect(mockEngine.addSystem).toHaveBeenCalledWith(expect.any(Function), 1)
      })
    })

    describe('error handling', () => {
      it('should log error and throw when start() fails for functional scripts', () => {
        const entity = 512 as Entity
        const error = new Error('Start failed')
        const startSpy = jest.fn(() => {
          throw error
        })
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

        ;(mockEngine.getEntityState as jest.Mock).mockReturnValue(EntityState.UsedEntity)

        const scripts = [
          {
            entity,
            path: 'test-script.ts',
            priority: 0,
            module: {
              start: startSpy
            }
          }
        ]

        expect(() => runScripts(mockEngine, scripts)).toThrow(error)
        expect(consoleErrorSpy).toHaveBeenCalledWith('[Script Error] test-script.ts start() failed:', error)

        consoleErrorSpy.mockRestore()
      })

      it('should log error and throw when class constructor fails', () => {
        const entity = 512 as Entity
        const error = new Error('Constructor failed')
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

        class TestScript {
          constructor(src: string, entity: Entity) {
            throw error
          }
        }

        ;(mockEngine.getEntityState as jest.Mock).mockReturnValue(EntityState.UsedEntity)

        const scripts = [
          {
            entity,
            path: 'test-script.ts',
            priority: 0,
            module: {
              TestScript
            }
          }
        ]

        expect(() => runScripts(mockEngine, scripts)).toThrow(error)
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[Script Error] test-script.ts class initialization failed:',
          error
        )

        consoleErrorSpy.mockRestore()
      })

      it('should catch and log errors in update() but not throw', () => {
        const entity = 512 as Entity
        const error = new Error('Update failed')
        const updateSpy = jest.fn(() => {
          throw error
        })
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

        ;(mockEngine.getEntityState as jest.Mock).mockReturnValue(EntityState.UsedEntity)

        const scripts = [
          {
            entity,
            path: 'test-script.ts',
            priority: 0,
            module: {
              start: jest.fn(),
              update: updateSpy
            }
          }
        ]

        runScripts(mockEngine, scripts)

        // Should not throw during update
        expect(() => addedSystems[0](0.016)).not.toThrow()
        expect(consoleErrorSpy).toHaveBeenCalledWith('[Script Error] update() failed:', error)

        consoleErrorSpy.mockRestore()
      })

      it('should log error when module is not found', () => {
        const entity = 512 as Entity
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

        ;(mockEngine.getEntityState as jest.Mock).mockReturnValue(EntityState.UsedEntity)

        const scripts = [
          {
            entity,
            path: 'test-script.ts',
            priority: 0,
            module: null as any
          }
        ]

        runScripts(mockEngine, scripts)

        expect(consoleErrorSpy).toHaveBeenCalledWith('[Script] Unknown module:', 'test-script.ts')

        consoleErrorSpy.mockRestore()
      })

      it('should log error when no class is found in module', () => {
        const entity = 512 as Entity
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

        ;(mockEngine.getEntityState as jest.Mock).mockReturnValue(EntityState.UsedEntity)

        const scripts = [
          {
            entity,
            path: 'test-script.ts',
            priority: 0,
            module: {
              someValue: 'not a class'
            }
          }
        ]

        runScripts(mockEngine, scripts)

        expect(consoleErrorSpy).toHaveBeenCalledWith('[Script] No class found in module:', 'test-script.ts')

        consoleErrorSpy.mockRestore()
      })
    })
  })
})
