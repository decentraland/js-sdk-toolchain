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

  constructor(private gizmoManager: GizmoManager) {}

  setup(): void {
    if (!this.gizmoManager.gizmos.rotationGizmo) return
    this.rotationGizmo = this.gizmoManager.gizmos.rotationGizmo
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
        // Para una sola entidad, hacer que el gizmo coincida con la rotación actual de la entidad
        const entity = entities[0]
        if (entity.rotationQuaternion && gizmoNode.rotationQuaternion) {
          // Si la entidad tiene un padre, necesitamos convertir a rotación mundial
          if (entity.parent && entity.parent instanceof TransformNode) {
            const parent = entity.parent as TransformNode
            const parentWorldRotation =
              parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
            const worldRotation = parentWorldRotation.multiply(entity.rotationQuaternion)
            gizmoNode.rotationQuaternion.copyFrom(worldRotation)
          } else {
            // Si no tiene padre, aplicar directamente
            gizmoNode.rotationQuaternion.copyFrom(entity.rotationQuaternion)
          }
        }
      } else if (entities.length > 1) {
        // Para múltiples entidades, resetear el gizmo a identidad
        if (gizmoNode.rotationQuaternion) {
          gizmoNode.rotationQuaternion.set(0, 0, 0, 1) // Quaternion.Identity()
        }

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
          this.initialRotations.set(entity.entityId, entity.rotationQuaternion?.clone() || Quaternion.Identity())
        }
      }
    } else if (entities.length > 1) {
      // Si la selección no cambió pero hay múltiples entidades, resetear el gizmo a identidad
      // para evitar aplicar la rotación anterior como rotación adicional
      if (gizmoNode.rotationQuaternion) {
        gizmoNode.rotationQuaternion.set(0, 0, 0, 1) // Quaternion.Identity()
      }
    } else if (entities.length === 1) {
      // Si la selección no cambió pero hay una sola entidad, sincronizar el gizmo con la rotación actual
      // para que comience desde la posición actual de la entidad
      const entity = entities[0]
      if (entity.rotationQuaternion && gizmoNode.rotationQuaternion) {
        // Si la entidad tiene un padre, necesitamos convertir a rotación mundial
        if (entity.parent && entity.parent instanceof TransformNode) {
          const parent = entity.parent as TransformNode
          const parentWorldRotation =
            parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
          const worldRotation = parentWorldRotation.multiply(entity.rotationQuaternion)
          gizmoNode.rotationQuaternion.copyFrom(worldRotation)
        } else {
          // Si no tiene padre, aplicar directamente
          gizmoNode.rotationQuaternion.copyFrom(entity.rotationQuaternion)
        }
      }
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
      // Caso de una sola entidad (comportamiento original)
      const entity = entities[0]

      if (gizmoNode.rotationQuaternion) {
        if (!entity.rotationQuaternion) {
          entity.rotationQuaternion = new Quaternion()
        }

        // Si el entity tiene un padre, necesitamos calcular la rotación local
        if (entity.parent && entity.parent instanceof TransformNode) {
          const parent = entity.parent as TransformNode
          const parentWorldRotation =
            parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())

          // Calcular la rotación local: worldRotation = parentRotation * localRotation
          // Entonces: localRotation = parentRotation.inverse() * worldRotation
          const localRotation = parentWorldRotation.invert().multiply(gizmoNode.rotationQuaternion)
          entity.rotationQuaternion.copyFrom(localRotation)
        } else {
          // Si no tiene padre, aplicar la rotación directamente
          entity.rotationQuaternion.copyFrom(gizmoNode.rotationQuaternion)
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
          this.initialRotations.set(entity.entityId, entity.rotationQuaternion?.clone() || Quaternion.Identity())
        }
      }

      // Aplicar la rotación del gizmo a todas las entidades
      for (const entity of entities) {
        const offset = this.initialOffsets.get(entity.entityId)
        const initialRotation = this.initialRotations.get(entity.entityId)

        if (!offset || !initialRotation) continue

        // Calcular la nueva posición rotada
        const rotationMatrix = new Matrix()
        gizmoNode.rotationQuaternion.toRotationMatrix(rotationMatrix)
        const rotatedOffset = Vector3.TransformCoordinates(offset, rotationMatrix)
        const newWorldPosition = this.multiTransform.position.add(rotatedOffset)

        // Aplicar la rotación compuesta: gizmoRotation * initialRotation
        const newWorldRotation = gizmoNode.rotationQuaternion.multiply(initialRotation)

        // Aplicar al entity considerando su padre
        if (entity.parent && entity.parent instanceof TransformNode) {
          const parent = entity.parent as TransformNode
          const parentWorldRotation =
            parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
          const parentWorldMatrixInverse = parent.getWorldMatrix().clone().invert()

          // Convertir posición mundial a local
          const localPosition = Vector3.TransformCoordinates(newWorldPosition, parentWorldMatrixInverse)
          // Convertir rotación mundial a local
          const localRotation = parentWorldRotation.invert().multiply(newWorldRotation)

          entity.position.copyFrom(localPosition)
          if (!entity.rotationQuaternion) {
            entity.rotationQuaternion = new Quaternion()
          }
          entity.rotationQuaternion.copyFrom(localRotation)
        } else {
          // Sin padre, aplicar directamente
          entity.position.copyFrom(newWorldPosition)
          if (!entity.rotationQuaternion) {
            entity.rotationQuaternion = new Quaternion()
          }
          entity.rotationQuaternion.copyFrom(newWorldRotation)
        }
      }
    }

    // Notificar cambios
    this.changeHandlers.forEach((handler) => handler())
  }

  onDragEnd(): void {
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
}
