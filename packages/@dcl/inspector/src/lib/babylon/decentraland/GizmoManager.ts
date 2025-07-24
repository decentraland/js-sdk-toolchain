import mitt from 'mitt'
import { GizmoManager as BabylonGizmoManager, Vector3, TransformNode, Quaternion } from '@babylonjs/core'
import { Vector3 as DclVector3 } from '@dcl/ecs-math'
import { SceneContext } from './SceneContext'
import { EcsEntity } from './EcsEntity'
import { GizmoType } from '../../utils/gizmo'
import { GizmoType as TransformerType } from './gizmos/types'
import { FreeGizmo, PositionGizmo, RotationGizmo, ScaleGizmo, IGizmoTransformer } from './gizmos'
import { snapManager, snapPosition, snapRotation, snapScale } from './snap-manager'

export function createGizmoManager(context: SceneContext) {
  // events
  const events = mitt<{ change: void }>()

  // Initialize state
  let selectedEntities: EcsEntity[] = []
  let isEnabled = true
  let currentTransformer: IGizmoTransformer | null = null
  let isUpdatingFromGizmo = false

  // Create and initialize Babylon.js gizmo manager
  const gizmoManager = new BabylonGizmoManager(context.scene)
  gizmoManager.usePointerToAttachGizmos = false

  // Create transformers
  const positionTransformer = new PositionGizmo(gizmoManager, snapPosition)
  const rotationTransformer = new RotationGizmo(gizmoManager, snapRotation)
  const scaleTransformer = new ScaleGizmo(gizmoManager, snapScale)
  const freeTransformer = new FreeGizmo(context.scene)

  // Add alignment state
  let isGizmoWorldAligned = true
  const isGizmoWorldAlignmentDisabled = false

  // Helper function to get world rotation of an entity
  function getWorldRotation(entity: EcsEntity): Quaternion {
    if (!entity.rotationQuaternion) return Quaternion.Identity()

    if (!entity.parent || !(entity.parent instanceof TransformNode)) {
      return entity.rotationQuaternion.clone()
    }

    const parent = entity.parent as TransformNode
    const parentWorldRotation = parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
    const entityLocalRotation = entity.rotationQuaternion || Quaternion.Identity()

    return parentWorldRotation.multiply(entityLocalRotation)
  }

  // Helper function to sync gizmo rotation
  function syncGizmoRotation(gizmoNode: TransformNode, entities: EcsEntity[], isWorldAligned: boolean): void {
    if (entities.length === 0) return

    if (isWorldAligned) {
      // World aligned: reset to identity rotation
      if (gizmoNode.rotationQuaternion) {
        gizmoNode.rotationQuaternion.set(0, 0, 0, 1)
      }
    } else {
      // Local aligned: sync with the first entity's rotation (if single entity)
      if (entities.length === 1) {
        const entity = entities[0]
        if (entity.rotationQuaternion && gizmoNode.rotationQuaternion) {
          const worldRotation = getWorldRotation(entity)
          gizmoNode.rotationQuaternion.copyFrom(worldRotation)
        }
      } else {
        // For multiple entities, always reset to identity rotation
        if (gizmoNode.rotationQuaternion) {
          gizmoNode.rotationQuaternion.set(0, 0, 0, 1)
        }
      }
    }

    gizmoNode.computeWorldMatrix(true)
  }

  function updateEntityPosition(entity: EcsEntity) {
    const currentTransform = context.Transform.getOrNull(entity.entityId)
    if (!currentTransform) return

    isUpdatingFromGizmo = true
    context.operations.updateValue(context.Transform, entity.entityId, {
      ...currentTransform,
      position: DclVector3.create(entity.position.x, entity.position.y, entity.position.z)
    })
  }

  function updateEntityRotation(entity: EcsEntity) {
    const currentTransform = context.Transform.getOrNull(entity.entityId)
    if (!currentTransform || !entity.rotationQuaternion) return

    isUpdatingFromGizmo = true
    // The RotationGizmo already applies the rotation in local coordinates
    // We only need to use the Babylon rotation directly
    const rotation = entity.rotationQuaternion
      ? {
          x: entity.rotationQuaternion.x,
          y: entity.rotationQuaternion.y,
          z: entity.rotationQuaternion.z,
          w: entity.rotationQuaternion.w
        }
      : currentTransform.rotation

    context.operations.updateValue(context.Transform, entity.entityId, {
      ...currentTransform,
      rotation
    })
  }

  function updateEntityScale(entity: EcsEntity) {
    const currentTransform = context.Transform.getOrNull(entity.entityId)
    if (!currentTransform) return

    isUpdatingFromGizmo = true
    context.operations.updateValue(context.Transform, entity.entityId, {
      ...currentTransform,
      scale: DclVector3.create(entity.scaling.x, entity.scaling.y, entity.scaling.z)
    })
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
    // Don't reset rotation if it already exists - let the gizmo transformers handle rotation

    node.computeWorldMatrix(true)
    gizmoManager.attachToNode(node)
  }

  // Update gizmo position and rotation based on current transformer type
  function updateGizmoTransform() {
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

    if (currentTransformer) {
      if (currentTransformer.type === TransformerType.ROTATION) {
        // Update rotation based on current transformer type
        syncGizmoRotation(node, selectedEntities, isGizmoWorldAligned)
      } else if (currentTransformer.type === TransformerType.FREE) {
        // Update free gizmo indicator with ECS updates
        ;(currentTransformer as FreeGizmo).updateGizmoIndicator()
      }
      // For non-rotation gizmos, let the transformers handle rotation
      // Don't reset rotation if it already exists
    }

    node.computeWorldMatrix(true)
    gizmoManager.attachToNode(node)
  }

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

  function setupTransformListeners() {
    selectedEntities.forEach((entity) => {
      context.Transform.onChange(entity.entityId, (_value) => {
        if (!isUpdatingFromGizmo && selectedEntities.some((e) => e.entityId === entity.entityId)) {
          setTimeout(() => updateGizmoTransform(), 0)
        }
      })
    })
  }

  function updateSnap() {
    if (currentTransformer && 'setSnapDistance' in currentTransformer) {
      if (gizmoManager.rotationGizmoEnabled) {
        currentTransformer.setSnapDistance(snapManager.isEnabled() ? snapManager.getRotationSnap() : 0)
      } else if (gizmoManager.scaleGizmoEnabled) {
        currentTransformer.setSnapDistance(snapManager.isEnabled() ? snapManager.getScaleSnap() : 0)
      } else {
        currentTransformer.setSnapDistance(snapManager.isEnabled() ? snapManager.getPositionSnap() : 0)
      }
    }
  }
  snapManager.onChange(updateSnap)

  return {
    gizmoManager,
    isEnabled() {
      return isEnabled
    },
    setEnabled(value: boolean) {
      isEnabled = value
      if (!isEnabled) {
        gizmoManager.attachToNode(null)
      }
    },
    restoreParents,
    addEntity(entity: EcsEntity) {
      if (selectedEntities.includes(entity) || !isEnabled) return
      selectedEntities.push(entity)
      updateGizmoPosition()
      setupTransformListeners()
      // Update current transformer with new entities
      if (currentTransformer) {
        currentTransformer.setEntities(selectedEntities)
      }
      events.emit('change')
    },
    getEntity() {
      return selectedEntities[0]
    },
    removeEntity(entity: EcsEntity) {
      selectedEntities = selectedEntities.filter((e) => e.entityId !== entity.entityId)
      if (selectedEntities.length === 0) {
        gizmoManager.attachToNode(null)
      } else {
        updateGizmoPosition()
      }

      // Update current transformer with remaining entities
      if (currentTransformer) {
        currentTransformer.setEntities(selectedEntities)
      }
    },
    getGizmoTypes() {
      return [GizmoType.FREE, GizmoType.POSITION, GizmoType.ROTATION, GizmoType.SCALE] as const
    },
    setGizmoType(type: GizmoType) {
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
          currentTransformer.setup()
          currentTransformer.setEntities(selectedEntities)

          // Set up callbacks for ECS updates
          if ('setUpdateCallbacks' in currentTransformer) {
            currentTransformer.setUpdateCallbacks(updateEntityPosition, () => {
              void context.operations.dispatch()
              isUpdatingFromGizmo = false
            })
          }

          // Set world alignment
          if ('setWorldAligned' in currentTransformer) {
            currentTransformer.setWorldAligned(isGizmoWorldAligned)
          }

          gizmoManager.positionGizmoEnabled = true

          // Enable the position gizmo to set up its observables
          if ('enable' in currentTransformer) {
            currentTransformer.enable()
          }

          if ('setSnapDistance' in currentTransformer) {
            currentTransformer.setSnapDistance(snapManager.isEnabled() ? snapManager.getPositionSnap() : 0)
          }

          break
        }
        case GizmoType.ROTATION: {
          currentTransformer = rotationTransformer
          currentTransformer.setup()
          currentTransformer.setEntities(selectedEntities)

          // Set up callbacks for ECS updates
          if ('setUpdateCallbacks' in currentTransformer) {
            currentTransformer.setUpdateCallbacks(
              updateEntityRotation,
              updateEntityPosition,
              () => {
                void context.operations.dispatch()
                isUpdatingFromGizmo = false
              },
              context
            )
          }

          // Set world alignment
          if ('setWorldAligned' in currentTransformer) {
            currentTransformer.setWorldAligned(isGizmoWorldAligned)
          }

          gizmoManager.rotationGizmoEnabled = true

          // Enable the rotation gizmo to set up its observables
          if ('enable' in currentTransformer) {
            currentTransformer.enable()
          }

          if ('setSnapDistance' in currentTransformer) {
            currentTransformer.setSnapDistance(snapManager.isEnabled() ? snapManager.getRotationSnap() : 0)
          }

          break
        }
        case GizmoType.SCALE: {
          currentTransformer = scaleTransformer
          currentTransformer.setup()
          currentTransformer.setEntities(selectedEntities)

          // Set up callbacks for ECS updates
          if ('setUpdateCallbacks' in currentTransformer) {
            currentTransformer.setUpdateCallbacks(updateEntityScale, () => {
              void context.operations.dispatch()
              isUpdatingFromGizmo = false
            })
          }

          // Set world alignment
          if ('setWorldAligned' in currentTransformer) {
            currentTransformer.setWorldAligned(isGizmoWorldAligned)
          }

          gizmoManager.scaleGizmoEnabled = true

          // Enable the scale gizmo to set up its observables
          if ('enable' in currentTransformer) {
            currentTransformer.enable()
          }

          if ('setSnapDistance' in currentTransformer) {
            currentTransformer.setSnapDistance(snapManager.isEnabled() ? snapManager.getScaleSnap() : 0)
          }

          break
        }
        case GizmoType.FREE: {
          currentTransformer = freeTransformer
          currentTransformer.setup()
          currentTransformer.setEntities(selectedEntities)

          // Pass GizmoManager reference to FreeGizmo for centroid calculation
          if ('setGizmoManager' in currentTransformer) {
            ;(currentTransformer as any).setGizmoManager(calculateCentroid)
          }

          // Set up callbacks for ECS updates
          if ('setUpdateCallbacks' in currentTransformer) {
            currentTransformer.setUpdateCallbacks(updateEntityPosition, () => {
              void context.operations.dispatch()
              isUpdatingFromGizmo = false
            })
          }

          // Set world alignment
          if ('setWorldAligned' in currentTransformer) {
            currentTransformer.setWorldAligned(isGizmoWorldAligned)
          }

          // Set up callback to update gizmo position after drag ends
          if ('setOnDragEndCallback' in currentTransformer) {
            currentTransformer.setOnDragEndCallback?.(() => {
              updateGizmoPosition()
            })
          }

          // Enable the free gizmo to set up its observables
          if ('enable' in currentTransformer) {
            currentTransformer.enable()
          }

          if ('setSnapDistance' in currentTransformer) {
            currentTransformer.setSnapDistance(snapManager.isEnabled() ? snapManager.getPositionSnap() : 0)
          }

          break
        }
      }
      events.emit('change')
    },
    isGizmoWorldAligned() {
      return isGizmoWorldAligned
    },
    setGizmoWorldAligned(value: boolean) {
      isGizmoWorldAligned = value
      if (!!currentTransformer && 'setWorldAligned' in currentTransformer) {
        currentTransformer.setWorldAligned(value)
      }
      events.emit('change')
    },
    isGizmoWorldAlignmentDisabled() {
      return isGizmoWorldAlignmentDisabled
    },
    onChange(cb: () => void) {
      events.on('change', cb)
      return () => {
        events.off('change', cb)
      }
    },
    forceUpdateGizmo() {
      if (selectedEntities.length > 0) {
        updateGizmoTransform()
      }
    }
  }
}

export type Gizmos = ReturnType<typeof createGizmoManager>
