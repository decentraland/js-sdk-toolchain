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

  function updateEntityTransform(entity: EcsEntity) {
    const currentTransform = context.Transform.getOrNull(entity.entityId)
    if (!currentTransform) return

    context.operations.updateValue(context.Transform, entity.entityId, {
      position: DclVector3.create(entity.position.x, entity.position.y, entity.position.z),
      rotation: {
        x: entity.rotationQuaternion!.x,
        y: entity.rotationQuaternion!.y,
        z: entity.rotationQuaternion!.z,
        w: entity.rotationQuaternion!.w
      },
      scale: DclVector3.create(entity.scaling.x, entity.scaling.y, entity.scaling.z),
      parent: currentTransform.parent
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

    node.computeWorldMatrix(true)
    gizmoManager.attachToNode(node)

    // If we have a current transformer, initialize it with the selected entities
    if (currentTransformer) {
      currentTransformer.onDragStart(selectedEntities, node)
    }
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

  // Setup change handlers for all transformers
  const setupTransformerChangeHandler = (transformer: IGizmoTransformer) => {
    transformer.onChange(() => {
      selectedEntities.forEach(updateEntityTransform)
      void context.operations.dispatch()
    })
  }

  // Setup all transformers
  setupTransformerChangeHandler(positionTransformer)
  setupTransformerChangeHandler(rotationTransformer)
  setupTransformerChangeHandler(scaleTransformer)
  setupTransformerChangeHandler(freeTransformer)

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

      // Store current gizmo node rotation if it exists
      const currentNode = gizmoManager.attachedNode as TransformNode | null
      const previousRotation = currentNode?.rotationQuaternion?.clone()

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
                selectedEntities.forEach(updateEntityTransform)
                void context.operations.dispatch()
              }
            })

            // Setup drag end
            positionGizmo.onDragEndObservable.add(() => {
              console.log('[GizmoManager] Position drag end')
              if (currentTransformer) {
                currentTransformer.onDragEnd()
                selectedEntities.forEach(updateEntityTransform)
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
                // Ensure we start from a clean state
                const node = gizmoManager.attachedNode as TransformNode
                if (selectedEntities.length === 1) {
                  const entity = selectedEntities[0]
                  if (entity.rotationQuaternion) {
                    node.rotationQuaternion?.copyFrom(entity.rotationQuaternion)
                    node.computeWorldMatrix(true)
                  }
                }
                currentTransformer?.onDragStart(selectedEntities, node)
              }
            })

            // Setup drag update
            rotationGizmo.onDragObservable.add(() => {
              if (gizmoManager.attachedNode) {
                currentTransformer?.update(selectedEntities, gizmoManager.attachedNode as TransformNode)
                selectedEntities.forEach(updateEntityTransform)
                void context.operations.dispatch()
              }
            })

            // Setup drag end
            rotationGizmo.onDragEndObservable.add(() => {
              console.log('[GizmoManager] Rotation drag end')
              if (currentTransformer) {
                currentTransformer.onDragEnd()
                selectedEntities.forEach(updateEntityTransform)
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
                selectedEntities.forEach(updateEntityTransform)
                void context.operations.dispatch()
              }
            })

            // Setup drag end
            scaleGizmo.onDragEndObservable.add(() => {
              console.log('[GizmoManager] Scale drag end')
              if (currentTransformer) {
                currentTransformer.onDragEnd()
                selectedEntities.forEach(updateEntityTransform)
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

        // Update gizmo position and restore previous rotation if needed
        updateGizmoPosition()
        if (previousRotation && type === GizmoType.ROTATION) {
          const node = gizmoManager.attachedNode as TransformNode
          if (node) {
            node.rotationQuaternion?.copyFrom(previousRotation)
            node.computeWorldMatrix(true)
          }
        }
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
