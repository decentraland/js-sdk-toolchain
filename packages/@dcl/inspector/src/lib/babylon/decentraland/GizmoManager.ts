import { GizmoManager as BabylonGizmoManager, Vector3, TransformNode, Quaternion } from '@babylonjs/core'
import { Vector3 as DclVector3 } from '@dcl/ecs-math'
import { SceneContext } from './SceneContext'
import { EcsEntity } from './EcsEntity'
import { GizmoType } from '../../utils/gizmo'
import { FreeGizmo, PositionGizmo, RotationGizmo, ScaleGizmo, IGizmoTransformer } from './gizmos'
import { snapManager, snapPosition, snapRotation, snapScale } from './snap-manager'

// Define the transform type
interface WorldTransform {
  position: Vector3
  scale: Vector3
  rotation: Quaternion
}

export function createGizmoManager(context: SceneContext) {
  // Initialize state
  let selectedEntities: EcsEntity[] = []
  let isEnabled = true
  let currentTransformer: IGizmoTransformer | null = null

  // Create and initialize Babylon.js gizmo manager
  const gizmoManager = new BabylonGizmoManager(context.scene)
  gizmoManager.usePointerToAttachGizmos = false

  // Create transformers
  const positionTransformer = new PositionGizmo(gizmoManager)
  const rotationTransformer = new RotationGizmo(gizmoManager)
  const scaleTransformer = new ScaleGizmo(gizmoManager)
  const freeTransformer = new FreeGizmo(context.scene)

  // Add alignment state
  let isPositionGizmoWorldAligned = true
  let isRotationGizmoWorldAligned = true
  const isPositionGizmoAlignmentDisabled = false
  const isRotationGizmoAlignmentDisabled = false

  function updateEntityPosition(entity: EcsEntity) {
    const currentTransform = context.Transform.getOrNull(entity.entityId)
    if (!currentTransform) return

    context.operations.updateValue(context.Transform, entity.entityId, {
      ...currentTransform,
      position: DclVector3.create(entity.position.x, entity.position.y, entity.position.z)
    })
  }

  function updateEntityRotation(entity: EcsEntity) {
    const currentTransform = context.Transform.getOrNull(entity.entityId)
    if (!currentTransform || !entity.rotationQuaternion) return

    // Obtener el padre correcto del contexto ECS
    const parent = currentTransform.parent

    console.log('=== updateEntityRotation ===')
    console.log('Entity ID:', entity.entityId)
    console.log('Has parent in ECS:', !!parent)
    console.log('Has parent in Babylon:', !!(entity.parent && entity.parent instanceof TransformNode))
    console.log('Current ECS rotation:', currentTransform.rotation)
    console.log('Current Babylon rotation:', {
      x: entity.rotationQuaternion.x,
      y: entity.rotationQuaternion.y,
      z: entity.rotationQuaternion.z,
      w: entity.rotationQuaternion.w
    })

    // El RotationGizmo ya aplica la rotación en coordenadas locales
    // Solo necesitamos usar directamente la rotación de Babylon
    const rotation = entity.rotationQuaternion
      ? {
          x: entity.rotationQuaternion.x,
          y: entity.rotationQuaternion.y,
          z: entity.rotationQuaternion.z,
          w: entity.rotationQuaternion.w
        }
      : currentTransform.rotation

    console.log(
      'Current Babylon rotation:',
      entity.rotationQuaternion
        ? {
            x: entity.rotationQuaternion.x,
            y: entity.rotationQuaternion.y,
            z: entity.rotationQuaternion.z,
            w: entity.rotationQuaternion.w
          }
        : 'No rotation'
    )

    console.log('Final rotation to save:', rotation)
    console.log('========================')

    context.operations.updateValue(context.Transform, entity.entityId, {
      ...currentTransform,
      rotation
    })
  }

  function updateEntityScale(entity: EcsEntity) {
    const currentTransform = context.Transform.getOrNull(entity.entityId)
    if (!currentTransform) return

    context.operations.updateValue(context.Transform, entity.entityId, {
      ...currentTransform,
      scale: DclVector3.create(entity.scaling.x, entity.scaling.y, entity.scaling.z)
    })
  }

  function updateEntityTransform(entity: EcsEntity) {
    const currentTransform = context.Transform.getOrNull(entity.entityId)
    if (!currentTransform) return

    context.operations.updateValue(context.Transform, entity.entityId, {
      ...currentTransform,
      position: DclVector3.create(entity.position.x, entity.position.y, entity.position.z),
      scale: DclVector3.create(entity.scaling.x, entity.scaling.y, entity.scaling.z),
      rotation: entity.rotationQuaternion
        ? {
            x: entity.rotationQuaternion.x,
            y: entity.rotationQuaternion.y,
            z: entity.rotationQuaternion.z,
            w: entity.rotationQuaternion.w
          }
        : currentTransform.rotation
    })
  }

  function updateMultipleEntitiesRotation() {
    console.log('=== updateMultipleEntitiesRotation ===')
    console.log('Number of entities:', selectedEntities.length)

    // Para múltiples entidades, necesitamos actualizar tanto posición como rotación
    // porque las entidades se mueven alrededor del centroid
    selectedEntities.forEach((entity) => {
      const currentTransform = context.Transform.getOrNull(entity.entityId)
      if (!currentTransform) return

      console.log('--- Processing entity:', entity.entityId, '---')
      console.log('Has parent in ECS:', !!currentTransform.parent)
      console.log('Has parent in Babylon:', !!(entity.parent && entity.parent instanceof TransformNode))

      // Obtener el padre correcto del contexto ECS
      const parent = currentTransform.parent

      // Para entidades hijas, las coordenadas ya están en espacio local
      // porque el RotationGizmo ya las convirtió correctamente
      const position = DclVector3.create(entity.position.x, entity.position.y, entity.position.z)

      // El RotationGizmo ya aplica la rotación en coordenadas locales
      // Solo necesitamos usar directamente la rotación de Babylon
      const rotation = entity.rotationQuaternion
        ? {
            x: entity.rotationQuaternion.x,
            y: entity.rotationQuaternion.y,
            z: entity.rotationQuaternion.z,
            w: entity.rotationQuaternion.w
          }
        : currentTransform.rotation

      console.log(
        'Current Babylon rotation:',
        entity.rotationQuaternion
          ? {
              x: entity.rotationQuaternion.x,
              y: entity.rotationQuaternion.y,
              z: entity.rotationQuaternion.z,
              w: entity.rotationQuaternion.w
            }
          : 'No rotation'
      )

      console.log('Final rotation to save:', rotation)
      console.log('--- End entity ---')

      context.operations.updateValue(context.Transform, entity.entityId, {
        ...currentTransform,
        position,
        rotation
      })
    })

    console.log('=== End updateMultipleEntitiesRotation ===')
  }

  // Calculate centroid of selected entities
  function calculateCentroid(): Vector3 {
    if (selectedEntities.length === 0) return Vector3.Zero()

    const sum = selectedEntities.reduce((acc, entity) => {
      const worldPosition = entity.getAbsolutePosition()
      return acc.add(worldPosition)
    }, Vector3.Zero())

    return sum.scale(1 / selectedEntities.length)
  }

  // Helper function to get or create gizmo node
  function getGizmoNode(): TransformNode {
    let node = context.scene.getTransformNodeByName('GIZMO_NODE')
    if (!node) {
      node = new TransformNode('GIZMO_NODE', context.scene)
      node.rotationQuaternion = Quaternion.Identity()
    } else if (!node.rotationQuaternion) {
      node.rotationQuaternion = Quaternion.Identity()
    }
    return node
  }

  // Update gizmo position to centroid
  function updateGizmoPosition() {
    if (selectedEntities.length === 0) {
      gizmoManager.attachToNode(null)
      return
    }

    const node = getGizmoNode()
    const centroid = calculateCentroid()
    node.position = centroid

    // Preserve rotation when switching between gizmos
    if (!node.rotationQuaternion) {
      node.rotationQuaternion = Quaternion.Identity()
    }

    node.computeWorldMatrix(true)
    gizmoManager.attachToNode(node)
  }

  // Clean up all gizmo observers
  function cleanupAllGizmoObservers() {
    // Clean up position gizmo
    if (gizmoManager.gizmos.positionGizmo) {
      gizmoManager.gizmos.positionGizmo.onDragStartObservable.clear()
      gizmoManager.gizmos.positionGizmo.onDragObservable.clear()
      gizmoManager.gizmos.positionGizmo.onDragEndObservable.clear()
    }

    // Clean up rotation gizmo
    if (gizmoManager.gizmos.rotationGizmo) {
      gizmoManager.gizmos.rotationGizmo.onDragStartObservable.clear()
      gizmoManager.gizmos.rotationGizmo.onDragObservable.clear()
      gizmoManager.gizmos.rotationGizmo.onDragEndObservable.clear()
    }

    // Clean up scale gizmo
    if (gizmoManager.gizmos.scaleGizmo) {
      gizmoManager.gizmos.scaleGizmo.onDragStartObservable.clear()
      gizmoManager.gizmos.scaleGizmo.onDragObservable.clear()
      gizmoManager.gizmos.scaleGizmo.onDragEndObservable.clear()
    }
  }

  // Setup specific change handlers for each transformer type
  const setupPositionTransformerChangeHandler = (transformer: IGizmoTransformer) => {
    transformer.onChange(() => {
      selectedEntities.forEach(updateEntityPosition)
      void context.operations.dispatch()
    })
  }

  const setupRotationTransformerChangeHandler = (transformer: IGizmoTransformer) => {
    transformer.onChange(() => {
      // No actualizar ECS durante el drag para evitar interferir con el gizmo
      // La actualización se hará al final del drag
    })
  }

  const setupScaleTransformerChangeHandler = (transformer: IGizmoTransformer) => {
    transformer.onChange(() => {
      selectedEntities.forEach(updateEntityScale)
      void context.operations.dispatch()
    })
  }

  const setupFreeTransformerChangeHandler = (transformer: IGizmoTransformer) => {
    transformer.onChange(() => {
      selectedEntities.forEach(updateEntityTransform)
      void context.operations.dispatch()
    })
  }

  // Setup all transformers with appropriate handlers
  setupPositionTransformerChangeHandler(positionTransformer)
  setupRotationTransformerChangeHandler(rotationTransformer)
  setupScaleTransformerChangeHandler(scaleTransformer)
  setupFreeTransformerChangeHandler(freeTransformer)

  // Setup snap functionality
  function updateSnap() {
    if (gizmoManager.gizmos.positionGizmo) {
      gizmoManager.gizmos.positionGizmo.snapDistance = snapManager.isEnabled() ? snapManager.getPositionSnap() : 0
    }
    if (gizmoManager.gizmos.scaleGizmo) {
      gizmoManager.gizmos.scaleGizmo.snapDistance = snapManager.isEnabled() ? snapManager.getScaleSnap() : 0
    }
    if (gizmoManager.gizmos.rotationGizmo) {
      gizmoManager.gizmos.rotationGizmo.snapDistance = snapManager.isEnabled() ? snapManager.getRotationSnap() : 0
    }
  }
  snapManager.onChange(updateSnap)
  updateSnap()

  // Parent-child relationship handling
  function restoreParents() {
    selectedEntities.forEach((entity) => {
      const currentTransform = context.Transform.getOrNull(entity.entityId)
      if (currentTransform) {
        const parent = currentTransform.parent ? context.getEntityOrNull(currentTransform.parent) : null
        entity.setParent(parent)
      }
    })
  }

  return {
    gizmoManager,
    isEnabled() {
      return isEnabled
    },
    setEnabled(value: boolean) {
      isEnabled = value
      if (!isEnabled) {
        restoreParents()
        gizmoManager.attachToNode(null)
      }
    },
    restoreParents,
    addEntity(entity: EcsEntity) {
      if (selectedEntities.includes(entity) || !isEnabled) return
      restoreParents()
      selectedEntities.push(entity)
      updateGizmoPosition()
    },
    getEntity() {
      return selectedEntities[0]
    },
    removeEntity(entity: EcsEntity) {
      restoreParents()
      selectedEntities = selectedEntities.filter((e) => e.entityId !== entity.entityId)
      if (selectedEntities.length === 0) {
        gizmoManager.attachToNode(null)
      } else {
        updateGizmoPosition()
      }
    },
    getGizmoTypes() {
      return [GizmoType.POSITION, GizmoType.ROTATION, GizmoType.SCALE, GizmoType.FREE] as const
    },
    setGizmoType(type: GizmoType) {
      console.log('[GizmoManager] Setting gizmo type:', type)

      // First clean up all observers
      cleanupAllGizmoObservers()

      // Then disable all Babylon gizmos
      gizmoManager.positionGizmoEnabled = false
      gizmoManager.rotationGizmoEnabled = false
      gizmoManager.scaleGizmoEnabled = false

      // Clean up current transformer if any
      if (currentTransformer) {
        currentTransformer.cleanup()
        currentTransformer = null
      }

      // Setup the new transformer based on type
      switch (type) {
        case GizmoType.POSITION: {
          currentTransformer = positionTransformer
          gizmoManager.positionGizmoEnabled = true
          if (gizmoManager.gizmos.positionGizmo) {
            const positionGizmo = gizmoManager.gizmos.positionGizmo
            positionGizmo.updateGizmoRotationToMatchAttachedMesh = !isPositionGizmoWorldAligned

            // Setup drag start
            positionGizmo.onDragStartObservable.add(() => {
              console.log('[GizmoManager] Position drag start')
              if (gizmoManager.attachedNode) {
                currentTransformer?.onDragStart(selectedEntities, gizmoManager.attachedNode as TransformNode)
              }
            })

            // Setup drag update
            positionGizmo.onDragObservable.add(() => {
              if (gizmoManager.attachedNode) {
                currentTransformer?.update(selectedEntities, gizmoManager.attachedNode as TransformNode)
              }
            })

            // Setup drag end
            positionGizmo.onDragEndObservable.add(() => {
              console.log('[GizmoManager] Position drag end')
              if (currentTransformer) {
                currentTransformer.onDragEnd()
                selectedEntities.forEach(updateEntityPosition)
                void context.operations.dispatch()
              }
            })
          }
          break
        }
        case GizmoType.ROTATION: {
          currentTransformer = rotationTransformer
          gizmoManager.rotationGizmoEnabled = true
          if (gizmoManager.gizmos.rotationGizmo) {
            const rotationGizmo = gizmoManager.gizmos.rotationGizmo
            rotationGizmo.updateGizmoRotationToMatchAttachedMesh = !isRotationGizmoWorldAligned

            // Setup drag start
            rotationGizmo.onDragStartObservable.add(() => {
              console.log('[GizmoManager] Rotation drag start')
              if (gizmoManager.attachedNode) {
                currentTransformer?.onDragStart(selectedEntities, gizmoManager.attachedNode as TransformNode)
              }
            })

            // Setup drag update
            rotationGizmo.onDragObservable.add(() => {
              if (gizmoManager.attachedNode) {
                currentTransformer?.update(selectedEntities, gizmoManager.attachedNode as TransformNode)
              }
            })

            // Setup drag end
            rotationGizmo.onDragEndObservable.add(() => {
              console.log('[GizmoManager] Rotation drag end')
              if (currentTransformer) {
                currentTransformer.onDragEnd()

                console.log('=== DRAG END - Before ECS Update ===')
                selectedEntities.forEach((entity, index) => {
                  console.log(`Entity ${index + 1} (${entity.entityId}):`)
                  if (entity.rotationQuaternion) {
                    console.log('  Babylon rotation:', {
                      x: entity.rotationQuaternion.x,
                      y: entity.rotationQuaternion.y,
                      z: entity.rotationQuaternion.z,
                      w: entity.rotationQuaternion.w
                    })
                  } else {
                    console.log('  Babylon rotation: No rotation')
                  }

                  const currentTransform = context.Transform.getOrNull(entity.entityId)
                  if (currentTransform) {
                    console.log('  ECS rotation before update:', currentTransform.rotation)
                  }
                })

                // Actualizar ECS al final del drag
                if (selectedEntities.length === 1) {
                  // Para una sola entidad, solo actualizar rotación
                  selectedEntities.forEach(updateEntityRotation)
                } else if (selectedEntities.length > 1) {
                  // Para múltiples entidades, actualizar posición y rotación
                  updateMultipleEntitiesRotation()
                  // Restaurar las relaciones padre-hijo después de la actualización
                  restoreParents()
                }

                console.log('=== DRAG END - After ECS Update ===')
                selectedEntities.forEach((entity, index) => {
                  const currentTransform = context.Transform.getOrNull(entity.entityId)
                  if (currentTransform) {
                    console.log(
                      `Entity ${index + 1} (${entity.entityId}) ECS rotation after update:`,
                      currentTransform.rotation
                    )
                  }
                })

                void context.operations.dispatch()
              }
            })
          }
          break
        }
        case GizmoType.SCALE: {
          currentTransformer = scaleTransformer
          gizmoManager.scaleGizmoEnabled = true
          if (gizmoManager.gizmos.scaleGizmo) {
            const scaleGizmo = gizmoManager.gizmos.scaleGizmo
            scaleGizmo.updateGizmoRotationToMatchAttachedMesh = false

            // Setup drag start
            scaleGizmo.onDragStartObservable.add(() => {
              console.log('[GizmoManager] Scale drag start')
              if (gizmoManager.attachedNode) {
                currentTransformer?.onDragStart(selectedEntities, gizmoManager.attachedNode as TransformNode)
              }
            })

            // Setup drag update
            scaleGizmo.onDragObservable.add(() => {
              if (gizmoManager.attachedNode) {
                currentTransformer?.update(selectedEntities, gizmoManager.attachedNode as TransformNode)
              }
            })

            // Setup drag end
            scaleGizmo.onDragEndObservable.add(() => {
              console.log('[GizmoManager] Scale drag end')
              if (currentTransformer) {
                currentTransformer.onDragEnd()
                selectedEntities.forEach(updateEntityScale)
                void context.operations.dispatch()
              }
            })
          }
          break
        }
        case GizmoType.FREE:
          currentTransformer = freeTransformer
          break
      }

      // Setup the new transformer
      if (currentTransformer) {
        currentTransformer.setup()
      }
    },
    isPositionGizmoWorldAligned() {
      return isPositionGizmoWorldAligned
    },
    setPositionGizmoWorldAligned(value: boolean) {
      isPositionGizmoWorldAligned = value
      if (gizmoManager.gizmos.positionGizmo) {
        gizmoManager.gizmos.positionGizmo.updateGizmoRotationToMatchAttachedMesh = !value
      }
    },
    isRotationGizmoWorldAligned() {
      return isRotationGizmoWorldAligned
    },
    setRotationGizmoWorldAligned(value: boolean) {
      isRotationGizmoWorldAligned = value
      if (gizmoManager.gizmos.rotationGizmo) {
        gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = !value
      }
    },
    isRotationGizmoAlignmentDisabled() {
      return isRotationGizmoAlignmentDisabled
    },
    isPositionGizmoAlignmentDisabled() {
      return isPositionGizmoAlignmentDisabled
    },
    fixRotationGizmoAlignment() {
      if (gizmoManager.gizmos.rotationGizmo && selectedEntities.length === 1) {
        const entity = selectedEntities[0]
        if (entity.rotationQuaternion) {
          const node = getGizmoNode()
          node.rotationQuaternion?.copyFrom(entity.rotationQuaternion)
          node.computeWorldMatrix(true)
        }
      }
    },
    fixPositionGizmoAlignment() {
      if (gizmoManager.gizmos.positionGizmo && selectedEntities.length === 1) {
        const entity = selectedEntities[0]
        if (entity.rotationQuaternion) {
          const node = getGizmoNode()
          node.rotationQuaternion?.copyFrom(entity.rotationQuaternion)
          node.computeWorldMatrix(true)
        }
      }
    },
    onChange(cb: () => void) {
      const disposables: (() => void)[] = []

      // Add observers for position gizmo
      if (gizmoManager.gizmos.positionGizmo) {
        const startObs = gizmoManager.gizmos.positionGizmo.onDragStartObservable.add(cb)
        const endObs = gizmoManager.gizmos.positionGizmo.onDragEndObservable.add(cb)
        disposables.push(
          () => gizmoManager.gizmos.positionGizmo?.onDragStartObservable.remove(startObs),
          () => gizmoManager.gizmos.positionGizmo?.onDragEndObservable.remove(endObs)
        )
      }

      // Add observers for rotation gizmo
      if (gizmoManager.gizmos.rotationGizmo) {
        const startObs = gizmoManager.gizmos.rotationGizmo.onDragStartObservable.add(cb)
        const endObs = gizmoManager.gizmos.rotationGizmo.onDragEndObservable.add(cb)
        disposables.push(
          () => gizmoManager.gizmos.rotationGizmo?.onDragStartObservable.remove(startObs),
          () => gizmoManager.gizmos.rotationGizmo?.onDragEndObservable.remove(endObs)
        )
      }

      // Add observers for scale gizmo
      if (gizmoManager.gizmos.scaleGizmo) {
        const startObs = gizmoManager.gizmos.scaleGizmo.onDragStartObservable.add(cb)
        const endObs = gizmoManager.gizmos.scaleGizmo.onDragEndObservable.add(cb)
        disposables.push(
          () => gizmoManager.gizmos.scaleGizmo?.onDragStartObservable.remove(startObs),
          () => gizmoManager.gizmos.scaleGizmo?.onDragEndObservable.remove(endObs)
        )
      }

      // Add observers for free gizmo
      if (currentTransformer && 'onChange' in currentTransformer) {
        const dispose = (
          currentTransformer as IGizmoTransformer & { onChange: (cb: () => void) => () => void }
        ).onChange(cb)
        disposables.push(dispose)
      }

      return () => {
        disposables.forEach((dispose) => dispose())
      }
    }
  }
}

export type Gizmos = ReturnType<typeof createGizmoManager>
