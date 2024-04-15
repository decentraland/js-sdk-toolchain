import { Scene, NullEngine, Engine, Quaternion, Vector3 } from '@babylonjs/core'
import { Gizmos, createGizmoManager } from './gizmo-manager'
import { SceneContext } from './SceneContext'
import { EcsEntity } from './EcsEntity'
import { GizmoType } from '../../utils/gizmo'
import { EntityType } from '@dcl/schemas'
import { DataLayerRpcClient } from '../../data-layer/types'
import { Operations } from '../../sdk/operations'
import { Entity } from '@dcl/ecs'
import { EditorComponents, Node } from '../../sdk/components'
import { CAMERA, PLAYER, ROOT } from '../../sdk/tree'

describe('GizmoManager', () => {
  let engine: Engine
  let scene: Scene
  let context: SceneContext
  let entities: Entity[] = []
  let nodes: Node[] = [
    { entity: ROOT, children: entities },
    { entity: CAMERA, children: [] },
    { entity: PLAYER, children: [] }
  ]
  beforeEach(() => {
    engine = new NullEngine()
    scene = new Scene(engine)
    context = new SceneContext(
      engine,
      scene,
      {
        baseUrl: '/',
        entity: { content: [], metadata: {}, version: 'v3', type: EntityType.SCENE, timestamp: 1, pointers: ['0, 0'] },
        id: '123'
      },
      {} as DataLayerRpcClient
    )
    context.operations = {
      updateValue: jest.fn(),
      dispatch: jest.fn(),
      getSelectedEntities: jest.fn(() => [])
    } as unknown as Operations
    ;(context.editorComponents as any) = {
      Nodes: {
        getOrNull: jest.fn().mockReturnValue({
          value: nodes
        })
      }
    } as unknown as EditorComponents
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
      let dclEntity: Entity
      let babylonEntity: EcsEntity
      let handler: jest.Mock
      beforeEach(() => {
        dclEntity = context.engine.addEntity()
        context.Transform.create(dclEntity)
        babylonEntity = context.getOrCreateEntity(dclEntity)
        babylonEntity.rotationQuaternion = new Quaternion(0, 0, 0, 1)
        handler = jest.fn()
        gizmos.onChange(handler)
        gizmos.setEntity(babylonEntity)
        entities = [dclEntity]
        nodes.push({ entity: dclEntity, children: [] })
      })
      afterEach(() => {
        babylonEntity.dispose()
        context.engine.removeEntity(dclEntity)
        gizmos.unsetEntity()
        entities = []
        nodes = nodes.filter(($) => $.entity !== dclEntity)
      })
      it('should set the entity', () => {
        expect(gizmos.getEntity()).toBe(babylonEntity)
      })
      it('should emit a change event', () => {
        expect(handler).toHaveBeenCalled()
      })
      describe('and the entity was already set', () => {
        it('should skip setting the entity', () => {
          const handler = jest.fn()
          gizmos.onChange(handler)
          gizmos.setEntity(babylonEntity)
          expect(handler).not.toHaveBeenCalled()
        })
      })
      describe('and dragging a gizmo', () => {
        it('should not execute SDK operations if transform was not changed', () => {
          gizmos.gizmoManager.gizmos.positionGizmo?.onDragEndObservable.notifyObservers({} as any)
          expect(context.operations.updateValue).toBeCalledTimes(0)
          expect(context.operations.dispatch).toBeCalledTimes(0)
        })
        it('should execute SDK operations if transform was changed', () => {
          babylonEntity.position = new Vector3(10, 10, 10)
          gizmos.gizmoManager.gizmos.positionGizmo?.onDragEndObservable.notifyObservers({} as any)
          expect(context.operations.updateValue).toHaveBeenCalled()
          expect(context.operations.dispatch).toHaveBeenCalled()
        })
        describe('and the entity is not proportionally scaled', () => {
          beforeEach(() => {
            babylonEntity.scaling = new Vector3(1, 2, 1)
          })
          afterEach(() => {
            babylonEntity.scaling = new Vector3(1, 1, 1)
          })
          describe('and the rotation gizmo is not world aligned', () => {
            beforeEach(() => {
              gizmos.setRotationGizmoWorldAligned(false)
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
                babylonEntity.scaling = new Vector3(1, 1, 1)
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
            babylonEntity.scaling = new Vector3(1.0000001192092896, 0.9999998807907104, 1)
          })
          afterEach(() => {
            babylonEntity.scaling = new Vector3(1, 1, 1)
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
        expect(gizmos.getGizmoTypes()).toEqual([
          GizmoType.POSITION,
          GizmoType.ROTATION,
          GizmoType.SCALE,
          GizmoType.FREE
        ])
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
