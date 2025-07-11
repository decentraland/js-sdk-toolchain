import { Vector3, TransformNode, Quaternion, Matrix, GizmoManager, Nullable, IRotationGizmo } from '@babylonjs/core'
import { Entity } from '@dcl/ecs'
import { EcsEntity } from '../EcsEntity'
import { IGizmoTransformer } from './types'

export class RotationGizmo implements IGizmoTransformer {
  private changeHandlers: (() => void)[] = []
  private rotationGizmo: Nullable<IRotationGizmo> = null
  private multiTransform: TransformNode | null = null
  private initialOffsets = new Map<Entity, Vector3>()
  private initialRotations = new Map<Entity, Quaternion>()
  private currentEntityIds = new Set<Entity>()
  private dragStartRotation = Quaternion.Identity()
  private dragStartObserver: any = null
  private dragObserver: any = null
  private dragEndObserver: any = null
  private currentEntities: EcsEntity[] = []
  private updateEntityRotation: ((entity: EcsEntity) => void) | null = null
  private updateEntityPosition: ((entity: EcsEntity) => void) | null = null
  private dispatchOperations: (() => void) | null = null
  private isWorldAligned = true
  private sceneContext: any = null

  constructor(private gizmoManager: GizmoManager, private snapRotation: (rotation: Quaternion) => Quaternion) {}

  setup(): void {
    if (!this.gizmoManager.gizmos.rotationGizmo) return
    this.rotationGizmo = this.gizmoManager.gizmos.rotationGizmo
    this.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = !this.isWorldAligned
    // Don't setup drag observables here - they will be set up when the gizmo is enabled
  }

  enable(): void {
    if (!this.gizmoManager.gizmos.rotationGizmo) return

    // Setup drag observables when the gizmo is enabled
    this.setupDragObservables()
  }

  cleanup(): void {
    this.rotationGizmo = null
    if (this.multiTransform) {
      this.multiTransform.dispose()
      this.multiTransform = null
    }
    this.initialOffsets.clear()
    this.initialRotations.clear()
    this.currentEntityIds.clear()

    // Clean up drag observables
    this.cleanupDragObservables()
  }

  setEntities(entities: EcsEntity[]): void {
    this.currentEntities = entities
    // Update current entity IDs for selection change detection
    this.currentEntityIds = new Set(entities.map((e) => e.entityId))

    // Sync gizmo rotation with the new entities
    this.syncGizmoRotation()
  }

  setUpdateCallbacks(
    updateEntityRotation: (entity: EcsEntity) => void,
    updateEntityPosition: (entity: EcsEntity) => void,
    dispatchOperations: () => void,
    sceneContext?: any
  ): void {
    this.updateEntityRotation = updateEntityRotation
    this.updateEntityPosition = updateEntityPosition
    this.dispatchOperations = dispatchOperations
    this.sceneContext = sceneContext
  }

  setWorldAligned(value: boolean): void {
    console.log('=== SET ROTATION WORLD ALIGNED ===', value)
    this.isWorldAligned = value
    if (this.gizmoManager.gizmos.rotationGizmo) {
      this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = !value
    }

    // Sync gizmo rotation with the new alignment setting
    this.syncGizmoRotation()
  }

  private syncGizmoRotation(): void {
    if (!this.gizmoManager.attachedNode || this.currentEntities.length === 0) return

    const gizmoNode = this.gizmoManager.attachedNode as TransformNode

    if (this.isWorldAligned) {
      // World aligned: reset to identity rotation
      if (gizmoNode.rotationQuaternion) {
        gizmoNode.rotationQuaternion.set(0, 0, 0, 1) // Quaternion.Identity()
      }
    } else {
      // Local aligned: sync with the first entity's rotation (if single entity)
      // For multiple entities, always reset to identity for consistent behavior
      if (this.currentEntities.length === 1) {
        const entity = this.currentEntities[0]
        if (entity.rotationQuaternion && gizmoNode.rotationQuaternion) {
          // If the entity has a parent, convert to world rotation
          if (entity.parent && entity.parent instanceof TransformNode) {
            const parent = entity.parent as TransformNode
            const parentWorldRotation =
              parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
            const worldRotation = parentWorldRotation.multiply(entity.rotationQuaternion)
            gizmoNode.rotationQuaternion.copyFrom(worldRotation)
          } else {
            // If no parent, apply directly
            gizmoNode.rotationQuaternion.copyFrom(entity.rotationQuaternion)
          }
        }
      } else {
        // For multiple entities, always reset to identity rotation
        // This provides a consistent reference point for rotation operations
        if (gizmoNode.rotationQuaternion) {
          gizmoNode.rotationQuaternion.set(0, 0, 0, 1) // Quaternion.Identity()
        }
      }
    }

    gizmoNode.computeWorldMatrix(true)
  }

  private setupDragObservables(): void {
    if (!this.gizmoManager.gizmos.rotationGizmo) return

    const rotationGizmo = this.gizmoManager.gizmos.rotationGizmo

    // Setup drag start
    this.dragStartObserver = rotationGizmo.onDragStartObservable.add(() => {
      if (this.gizmoManager.attachedNode) {
        this.onDragStart(this.currentEntities, this.gizmoManager.attachedNode as TransformNode)
      }
    })

    // Setup drag update
    this.dragObserver = rotationGizmo.onDragObservable.add(() => {
      if (this.gizmoManager.attachedNode) {
        this.update(this.currentEntities, this.gizmoManager.attachedNode as TransformNode)

        // Update ECS rotation on each drag update for real-time feedback
        if (this.updateEntityRotation) {
          this.currentEntities.forEach(this.updateEntityRotation)
        }
      }
    })

    // Setup drag end
    this.dragEndObserver = rotationGizmo.onDragEndObservable.add(() => {
      this.onDragEnd()

      // Only dispatch operations at the end to avoid excessive ECS operations
      if (this.dispatchOperations) {
        this.dispatchOperations()
      }
    })
  }

  private cleanupDragObservables(): void {
    if (!this.gizmoManager.gizmos.rotationGizmo) return

    const rotationGizmo = this.gizmoManager.gizmos.rotationGizmo

    if (this.dragStartObserver) {
      rotationGizmo.onDragStartObservable.remove(this.dragStartObserver)
      this.dragStartObserver = null
    }

    if (this.dragObserver) {
      rotationGizmo.onDragObservable.remove(this.dragObserver)
      this.dragObserver = null
    }

    if (this.dragEndObserver) {
      rotationGizmo.onDragEndObservable.remove(this.dragEndObserver)
      this.dragEndObserver = null
    }
  }

  onDragStart(entities: EcsEntity[], gizmoNode: TransformNode): void {
    // Verificar si la selección de entidades cambió
    const newEntityIds = new Set(entities.map((e) => e.entityId))
    const selectionChanged = this.hasSelectionChanged(newEntityIds)

    if (selectionChanged) {
      // Limpiar datos anteriores
      this.initialOffsets.clear()
      this.initialRotations.clear()
      this.currentEntityIds = newEntityIds

      if (entities.length === 1) {
        // For single entity, store the initial rotation
        const entity = entities[0]
        if (this.isWorldAligned) {
          // For world-aligned, store the world rotation
          if (entity.parent && entity.parent instanceof TransformNode) {
            const parent = entity.parent as TransformNode
            const parentWorldRotation =
              parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
            const entityLocalRotation = entity.rotationQuaternion || Quaternion.Identity()
            const worldRotation = parentWorldRotation.multiply(entityLocalRotation)
            this.initialRotations.set(entity.entityId, worldRotation)
          } else {
            // No parent, local rotation is world rotation
            this.initialRotations.set(entity.entityId, entity.rotationQuaternion?.clone() || Quaternion.Identity())
          }
        } else {
          // For local-aligned, store the local rotation
          this.initialRotations.set(entity.entityId, entity.rotationQuaternion?.clone() || Quaternion.Identity())
        }
      } else if (entities.length > 1) {
        // Crear el multiTransform en el centroid
        const centroid = this.calculateCentroid(entities)
        if (this.multiTransform) {
          this.multiTransform.dispose()
        }
        this.multiTransform = new TransformNode('multiTransform', entities[0].scene)
        this.multiTransform.position = centroid
        this.multiTransform.rotationQuaternion = Quaternion.Identity()

        // Guardar las posiciones y rotaciones iniciales de todas las entidades
        for (const entity of entities) {
          const worldPosition = entity.getAbsolutePosition()
          const offset = worldPosition.subtract(centroid)
          this.initialOffsets.set(entity.entityId, offset)

          // Guardar la rotación actual como inicial
          if (this.isWorldAligned) {
            // For world-aligned, store the world rotation
            if (entity.parent && entity.parent instanceof TransformNode) {
              const parent = entity.parent as TransformNode
              const parentWorldRotation =
                parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
              const entityLocalRotation = entity.rotationQuaternion || Quaternion.Identity()
              const worldRotation = parentWorldRotation.multiply(entityLocalRotation)
              this.initialRotations.set(entity.entityId, worldRotation)
            } else {
              // No parent, local rotation is world rotation
              this.initialRotations.set(entity.entityId, entity.rotationQuaternion?.clone() || Quaternion.Identity())
            }
          } else {
            // For local-aligned, store the local rotation
            this.initialRotations.set(entity.entityId, entity.rotationQuaternion?.clone() || Quaternion.Identity())
          }
        }
      }
    } else {
      // Even if selection didn't change, we need to update initial rotations
      // This handles the case when switching between different entities with the same count
      if (entities.length === 1) {
        const entity = entities[0]
        if (this.isWorldAligned) {
          // For world-aligned, store the world rotation
          if (entity.parent && entity.parent instanceof TransformNode) {
            const parent = entity.parent as TransformNode
            const parentWorldRotation =
              parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
            const entityLocalRotation = entity.rotationQuaternion || Quaternion.Identity()
            const worldRotation = parentWorldRotation.multiply(entityLocalRotation)
            this.initialRotations.set(entity.entityId, worldRotation)
          } else {
            // No parent, local rotation is world rotation
            this.initialRotations.set(entity.entityId, entity.rotationQuaternion?.clone() || Quaternion.Identity())
          }
        } else {
          // For local-aligned, store the local rotation
          this.initialRotations.set(entity.entityId, entity.rotationQuaternion?.clone() || Quaternion.Identity())
        }
      } else if (entities.length > 1) {
        for (const entity of entities) {
          if (this.isWorldAligned) {
            // For world-aligned, store the world rotation
            if (entity.parent && entity.parent instanceof TransformNode) {
              const parent = entity.parent as TransformNode
              const parentWorldRotation =
                parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
              const entityLocalRotation = entity.rotationQuaternion || Quaternion.Identity()
              const worldRotation = parentWorldRotation.multiply(entityLocalRotation)
              this.initialRotations.set(entity.entityId, worldRotation)
            } else {
              // No parent, local rotation is world rotation
              this.initialRotations.set(entity.entityId, entity.rotationQuaternion?.clone() || Quaternion.Identity())
            }
          } else {
            // For local-aligned, store the local rotation
            this.initialRotations.set(entity.entityId, entity.rotationQuaternion?.clone() || Quaternion.Identity())
          }
        }
      }
    }

    // Store the initial gizmo rotation for delta calculation
    if (gizmoNode.rotationQuaternion) {
      this.dragStartRotation.copyFrom(gizmoNode.rotationQuaternion)
    } else {
      this.dragStartRotation.set(0, 0, 0, 1)
    }
  }

  private hasSelectionChanged(newEntityIds: Set<Entity>): boolean {
    if (this.currentEntityIds.size !== newEntityIds.size) return true

    for (const id of newEntityIds) {
      if (!this.currentEntityIds.has(id)) return true
    }

    return false
  }

  update(entities: EcsEntity[], gizmoNode: TransformNode): void {
    if (entities.length === 0) return

    if (entities.length === 1) {
      // Caso de una sola entidad
      const entity = entities[0]

      if (gizmoNode.rotationQuaternion) {
        if (!entity.rotationQuaternion) {
          entity.rotationQuaternion = new Quaternion()
        }

        if (this.isWorldAligned) {
          // For world-aligned, check if the gizmo has actually rotated
          const currentGizmoRotation = gizmoNode.rotationQuaternion
          const hasRotated = !currentGizmoRotation.equals(this.dragStartRotation)

          if (hasRotated) {
            // Calculate the rotation delta from drag start
            const rotationDelta = this.dragStartRotation.invert().multiply(currentGizmoRotation)

            // Apply the delta to the entity's initial rotation
            const initialRotation = this.initialRotations.get(entity.entityId) || Quaternion.Identity()
            const newWorldRotation = rotationDelta.multiply(initialRotation)

            // Si el entity tiene un padre, necesitamos calcular la rotación local
            if (entity.parent && entity.parent instanceof TransformNode) {
              const parent = entity.parent as TransformNode
              const parentWorldRotation =
                parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())

              // Calcular la rotación local: worldRotation = parentRotation * localRotation
              // Entonces: localRotation = parentRotation.inverse() * worldRotation
              const localRotation = parentWorldRotation.invert().multiply(newWorldRotation)
              const snappedLocalRotation = this.snapRotation(localRotation)
              entity.rotationQuaternion.copyFrom(snappedLocalRotation)
            } else {
              // Si no tiene padre, aplicar la rotación directamente con snapping
              const snappedRotation = this.snapRotation(newWorldRotation)
              entity.rotationQuaternion.copyFrom(snappedRotation)
            }
          } else {
            // Gizmo hasn't rotated, keep the entity's initial rotation
            const initialRotation = this.initialRotations.get(entity.entityId) || Quaternion.Identity()
            if (this.isWorldAligned && entity.parent && entity.parent instanceof TransformNode) {
              // Convert world rotation back to local rotation for child entities
              const parent = entity.parent as TransformNode
              const parentWorldRotation =
                parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
              const localRotation = parentWorldRotation.invert().multiply(initialRotation)
              entity.rotationQuaternion.copyFrom(localRotation)
            } else {
              // For non-child entities or local-aligned, use the stored rotation directly
              entity.rotationQuaternion.copyFrom(initialRotation)
            }
          }
        } else {
          // For local-aligned, use the gizmo rotation directly
          // Si el entity tiene un padre, necesitamos calcular la rotación local
          if (entity.parent && entity.parent instanceof TransformNode) {
            const parent = entity.parent as TransformNode
            const parentWorldRotation =
              parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())

            // Calcular la rotación local: worldRotation = parentRotation * localRotation
            // Entonces: localRotation = parentRotation.inverse() * worldRotation
            const localRotation = parentWorldRotation.invert().multiply(gizmoNode.rotationQuaternion)
            const snappedLocalRotation = this.snapRotation(localRotation)
            entity.rotationQuaternion.copyFrom(snappedLocalRotation)
          } else {
            // Si no tiene padre, aplicar la rotación directamente con snapping
            const snappedRotation = this.snapRotation(gizmoNode.rotationQuaternion)
            entity.rotationQuaternion.copyFrom(snappedRotation)
          }
        }
      }
    } else {
      // Caso de múltiples entidades
      if (!gizmoNode.rotationQuaternion) return

      // Asegurar que tenemos el multiTransform y los datos iniciales
      if (!this.multiTransform || this.initialOffsets.size === 0) {
        // Si no tenemos los datos, recrearlos
        const centroid = this.calculateCentroid(entities)
        if (this.multiTransform) {
          this.multiTransform.dispose()
        }
        this.multiTransform = new TransformNode('multiTransform', entities[0].scene)
        this.multiTransform.position = centroid
        this.multiTransform.rotationQuaternion = Quaternion.Identity()

        // Guardar las posiciones y rotaciones iniciales
        this.initialOffsets.clear()
        this.initialRotations.clear()

        for (const entity of entities) {
          const worldPosition = entity.getAbsolutePosition()
          const offset = worldPosition.subtract(centroid)
          this.initialOffsets.set(entity.entityId, offset)

          // Store the appropriate rotation based on alignment
          if (this.isWorldAligned) {
            // For world-aligned, store the world rotation
            if (entity.parent && entity.parent instanceof TransformNode) {
              const parent = entity.parent as TransformNode
              const parentWorldRotation =
                parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
              const entityLocalRotation = entity.rotationQuaternion || Quaternion.Identity()
              const worldRotation = parentWorldRotation.multiply(entityLocalRotation)
              this.initialRotations.set(entity.entityId, worldRotation)
            } else {
              // No parent, local rotation is world rotation
              this.initialRotations.set(entity.entityId, entity.rotationQuaternion?.clone() || Quaternion.Identity())
            }
          } else {
            // For local-aligned, store the local rotation
            this.initialRotations.set(entity.entityId, entity.rotationQuaternion?.clone() || Quaternion.Identity())
          }
        }
      }

      // For multiple entities, always use delta-based approach for consistent behavior
      const currentGizmoRotation = gizmoNode.rotationQuaternion
      const hasRotated = !currentGizmoRotation.equals(this.dragStartRotation)

      if (hasRotated) {
        // Calculate the rotation delta from drag start
        const rotationDelta = this.dragStartRotation.invert().multiply(currentGizmoRotation)

        // Aplicar la rotación del gizmo a todas las entidades
        for (const entity of entities) {
          const offset = this.initialOffsets.get(entity.entityId)
          const initialRotation = this.initialRotations.get(entity.entityId)

          if (!offset || !initialRotation) continue

          // Calcular la nueva posición rotada
          const rotationMatrix = new Matrix()
          rotationDelta.toRotationMatrix(rotationMatrix)
          const rotatedOffset = Vector3.TransformCoordinates(offset, rotationMatrix)
          const newWorldPosition = this.multiTransform.position.add(rotatedOffset)

          // Aplicar la rotación compuesta: rotationDelta * initialRotation
          const newWorldRotation = rotationDelta.multiply(initialRotation)

          // Aplicar al entity considerando su padre
          if (entity.parent && entity.parent instanceof TransformNode) {
            const parent = entity.parent as TransformNode
            const parentWorldRotation =
              parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
            const parentWorldMatrixInverse = parent.getWorldMatrix().clone().invert()

            // Convertir posición mundial a local
            const localPosition = Vector3.TransformCoordinates(newWorldPosition, parentWorldMatrixInverse)
            // Convertir rotación mundial a local y aplicar snapping
            const localRotation = parentWorldRotation.invert().multiply(newWorldRotation)
            const snappedLocalRotation = this.snapRotation(localRotation)

            entity.position.copyFrom(localPosition)
            if (!entity.rotationQuaternion) {
              entity.rotationQuaternion = new Quaternion()
            }
            entity.rotationQuaternion.copyFrom(snappedLocalRotation)
          } else {
            // Sin padre, aplicar directamente con snapping
            const snappedWorldRotation = this.snapRotation(newWorldRotation)
            entity.position.copyFrom(newWorldPosition)
            if (!entity.rotationQuaternion) {
              entity.rotationQuaternion = new Quaternion()
            }
            entity.rotationQuaternion.copyFrom(snappedWorldRotation)
          }
        }
      } else {
        // Gizmo hasn't rotated, keep entities at their initial state
        for (const entity of entities) {
          const initialRotation = this.initialRotations.get(entity.entityId) || Quaternion.Identity()
          if (!entity.rotationQuaternion) {
            entity.rotationQuaternion = new Quaternion()
          }
          if (this.isWorldAligned && entity.parent && entity.parent instanceof TransformNode) {
            // Convert world rotation back to local rotation for child entities
            const parent = entity.parent as TransformNode
            const parentWorldRotation =
              parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
            const localRotation = parentWorldRotation.invert().multiply(initialRotation)
            entity.rotationQuaternion.copyFrom(localRotation)
          } else {
            // For non-child entities or local-aligned, use the stored rotation directly
            entity.rotationQuaternion.copyFrom(initialRotation)
          }
        }
      }
    }

    // Notificar cambios
    this.changeHandlers.forEach((handler) => handler())

    // Update gizmo visual alignment during drag when not world-aligned
    if (!this.isWorldAligned && this.currentEntities.length === 1) {
      const entity = this.currentEntities[0]
      if (entity.rotationQuaternion && gizmoNode.rotationQuaternion) {
        // If the entity has a parent, convert to world rotation
        if (entity.parent && entity.parent instanceof TransformNode) {
          const parent = entity.parent as TransformNode
          const parentWorldRotation =
            parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
          const worldRotation = parentWorldRotation.multiply(entity.rotationQuaternion)
          gizmoNode.rotationQuaternion.copyFrom(worldRotation)
        } else {
          // If no parent, apply directly
          gizmoNode.rotationQuaternion.copyFrom(entity.rotationQuaternion)
        }
        gizmoNode.computeWorldMatrix(true)
      }
    }
  }

  onDragEnd(): void {
    // Update ECS for multiple entities rotation
    if (this.currentEntities.length > 1) {
      this.updateMultipleEntitiesRotation()
    }

    // Sync gizmo rotation with the final snapped rotations of entities
    this.syncGizmoRotation()

    // Limpiar el multiTransform después del drag
    if (this.multiTransform) {
      this.multiTransform.dispose()
      this.multiTransform = null
    }
    this.initialOffsets.clear()
    this.initialRotations.clear()
  }

  onChange(callback: () => void): () => void {
    this.changeHandlers.push(callback)
    return () => {
      const index = this.changeHandlers.indexOf(callback)
      if (index !== -1) {
        this.changeHandlers.splice(index, 1)
      }
    }
  }

  private calculateCentroid(entities: EcsEntity[]): Vector3 {
    if (entities.length === 0) return Vector3.Zero()

    const sum = entities.reduce((acc, entity) => {
      const worldPosition = entity.getAbsolutePosition()
      return acc.add(worldPosition)
    }, Vector3.Zero())

    return sum.scale(1 / entities.length)
  }

  private updateMultipleEntitiesRotation(): void {
    if (!this.sceneContext || this.currentEntities.length <= 1) return

    console.log('=== updateMultipleEntitiesRotation ===')
    console.log('Number of entities:', this.currentEntities.length)

    // Para múltiples entidades, necesitamos actualizar tanto posición como rotación
    // porque las entidades se mueven alrededor del centroid
    this.currentEntities.forEach((entity) => {
      if (this.updateEntityRotation) {
        this.updateEntityRotation(entity)
      }
      if (this.updateEntityPosition) {
        this.updateEntityPosition(entity)
      }
    })

    // Dispatch operations at the end
    if (this.dispatchOperations) {
      this.dispatchOperations()
    }

    console.log('=== End updateMultipleEntitiesRotation ===')
  }
}
