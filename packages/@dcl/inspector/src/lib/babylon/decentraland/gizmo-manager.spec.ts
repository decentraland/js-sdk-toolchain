import { Scene, NullEngine, Engine, TransformNode, Quaternion, Vector3 } from '@babylonjs/core'
import { Gizmos, createGizmoManager } from './gizmo-manager'
import { SceneContext } from './SceneContext'
import { TransformComponentExtended } from '@dcl/ecs'
import { Operations } from '../../sdk/operations'
import { EcsEntity } from './EcsEntity'
import { GizmoType } from '../../utils/gizmo'

describe('GizmoManager', () => {
  let engine: Engine
  let scene: Scene
  let context: SceneContext
  beforeEach(() => {
    engine = new NullEngine()
    scene = new Scene(engine)
    context = {
      scene,
      operations: {
        updateValue: jest.fn(),
        dispatch: jest.fn()
      } as unknown as Operations,
      Transform: { getOrNull: jest.fn() } as unknown as TransformComponentExtended
    } as SceneContext
  })
  describe('When creating a new gizmo manager', () => {
    let gizmos: Gizmos
    beforeEach(() => {
      gizmos = createGizmoManager(context)
    })
    it('should return a gizmo manager', () => {
      expect(gizmos).toBeDefined()
    })
    describe('When setting an entity', () => {
      let entity: TransformNode
      let handler: jest.Mock
      beforeEach(() => {
        entity = new TransformNode('entity', scene)
        entity.rotationQuaternion = new Quaternion(0, 0, 0, 1)
        handler = jest.fn()
        gizmos.onChange(handler)
        gizmos.setEntity(entity as EcsEntity)
      })
      afterEach(() => {
        entity.dispose()
        gizmos.unsetEntity()
      })
      it('should set the entity', () => {
        expect(gizmos.getEntity()).toBe(entity)
      })
      it('should emit a change event', () => {
        expect(handler).toHaveBeenCalled()
      })
      describe('and the entity was already set', () => {
        it('should skip setting the entity', () => {
          const handler = jest.fn()
          gizmos.onChange(handler)
          gizmos.setEntity(entity as EcsEntity)
          expect(handler).not.toHaveBeenCalled()
        })
      })
      describe('and dragging a gizmo', () => {
        it('should execute SDK operations if transform was not changed', () => {
          gizmos.gizmoManager.gizmos.positionGizmo?.onDragStartObservable.notifyObservers({} as any)
          gizmos.gizmoManager.gizmos.positionGizmo?.onDragEndObservable.notifyObservers({} as any)
          expect(context.operations.updateValue).toBeCalledTimes(0)
          expect(context.operations.dispatch).toBeCalledTimes(0)
        })
        it('should not execute SDK operations if transform was changed', () => {
          gizmos.gizmoManager.gizmos.positionGizmo?.onDragStartObservable.notifyObservers({} as any)
          entity.position = new Vector3(10, 10, 10)
          gizmos.gizmoManager.gizmos.positionGizmo?.onDragEndObservable.notifyObservers({} as any)
          expect(context.operations.updateValue).toHaveBeenCalled()
          expect(context.operations.dispatch).toHaveBeenCalled()
        })
        describe('and the entity is not proportionally scaled', () => {
          beforeEach(() => {
            entity.scaling = new Vector3(1, 2, 1)
          })
          afterEach(() => {
            entity.scaling = new Vector3(1, 1, 1)
          })
          describe('and the rotation gizmo is not world aligned', () => {
            beforeEach(() => {
              gizmos.setRotationGizmoWorldAligned(false)
              gizmos.gizmoManager.gizmos.scaleGizmo?.onDragStartObservable.notifyObservers({} as any)
              gizmos.gizmoManager.gizmos.scaleGizmo?.onDragEndObservable.notifyObservers({} as any)
            })
            it('should force the rotation gizmo to be world aligned', () => {
              expect(gizmos.isRotationGizmoWorldAligned()).toBe(true)
            })
            it('should disable the rotation gizmo alignment', () => {
              expect(gizmos.isRotationGizmoAlignmentDisabled()).toBe(true)
            })
            it('should ignore setting the rotation gizmo alignment', () => {
              const handler = jest.fn()
              gizmos.onChange(handler)
              gizmos.setRotationGizmoWorldAligned(false)
              expect(handler).not.toHaveBeenCalled()
            })
            it('should allow setting the position gizmo alignment', () => {
              const handler = jest.fn()
              gizmos.onChange(handler)
              expect(gizmos.isPositionGizmoWorldAligned()).toBe(true)
              gizmos.setPositionGizmoWorldAligned(false)
              expect(gizmos.isPositionGizmoWorldAligned()).toBe(false)
              expect(handler).toHaveBeenCalled()
              handler.mockClear()
              gizmos.setPositionGizmoWorldAligned(true)
              expect(gizmos.isPositionGizmoWorldAligned()).toBe(true)
              expect(handler).toHaveBeenCalled()
            })
            describe('and the entity is then proportionally scaled', () => {
              beforeEach(() => {
                gizmos.gizmoManager.gizmos.scaleGizmo?.onDragStartObservable.notifyObservers({} as any)
                entity.scaling = new Vector3(1, 1, 1)
                gizmos.gizmoManager.gizmos.scaleGizmo?.onDragEndObservable.notifyObservers({} as any)
              })
              it('should enable the rotation gizmo alignment', () => {
                expect(gizmos.isRotationGizmoAlignmentDisabled()).toBe(false)
              })
              it('should restore the rotation gizmo alignment to be not aligned with the world', () => {
                expect(gizmos.isRotationGizmoWorldAligned()).toBe(false)
              })
              it('should allow setting the rotation gizmo alignment', () => {
                const handler = jest.fn()
                gizmos.onChange(handler)
                gizmos.setRotationGizmoWorldAligned(true)
                expect(handler).toHaveBeenCalled()
              })
            })
          })
        })
        describe('and the entity is almost proportionally scaled except for a tiny rounding error', () => {
          beforeEach(() => {
            entity.scaling = new Vector3(1.0000001192092896, 0.9999998807907104, 1)
          })
          afterEach(() => {
            entity.scaling = new Vector3(1, 1, 1)
          })
          it('should not force the rotation gizmo to be world aligned', () => {
            gizmos.setRotationGizmoWorldAligned(false)
            expect(gizmos.isRotationGizmoWorldAligned()).toBe(false)
            expect(gizmos.isRotationGizmoAlignmentDisabled()).toBe(false)
            gizmos.gizmoManager.gizmos.scaleGizmo?.onDragEndObservable.notifyObservers({} as any)
            expect(gizmos.isRotationGizmoWorldAligned()).toBe(false)
            expect(gizmos.isRotationGizmoAlignmentDisabled()).toBe(false)
          })
        })
      })
    })
    describe('When getting the gizmo types', () => {
      it('should return the gizmo types', () => {
        expect(gizmos.getGizmoTypes()).toEqual([GizmoType.POSITION, GizmoType.ROTATION, GizmoType.SCALE])
      })
    })
    describe('When setting the gizmo type', () => {
      describe('and the gizmo type is position', () => {
        it('should enable the position gizmo and disable the others', () => {
          gizmos.setGizmoType(GizmoType.POSITION)
          expect(gizmos.gizmoManager.positionGizmoEnabled).toBe(true)
          expect(gizmos.gizmoManager.rotationGizmoEnabled).toBe(false)
          expect(gizmos.gizmoManager.scaleGizmoEnabled).toBe(false)
        })
      })
      describe('and the gizmo type is rotation', () => {
        it('should enable the rotation gizmo and disable the others', () => {
          gizmos.setGizmoType(GizmoType.ROTATION)
          expect(gizmos.gizmoManager.positionGizmoEnabled).toBe(false)
          expect(gizmos.gizmoManager.rotationGizmoEnabled).toBe(true)
          expect(gizmos.gizmoManager.scaleGizmoEnabled).toBe(false)
        })
      })
      describe('and the gizmo type is scale', () => {
        it('should enable the scale gizmo and disable the others', () => {
          gizmos.setGizmoType(GizmoType.SCALE)
          expect(gizmos.gizmoManager.positionGizmoEnabled).toBe(false)
          expect(gizmos.gizmoManager.rotationGizmoEnabled).toBe(false)
          expect(gizmos.gizmoManager.scaleGizmoEnabled).toBe(true)
        })
      })
    })
  })
})
