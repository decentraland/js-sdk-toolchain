import mitt from 'mitt'
import { GizmoManager as BabylonGizmoManager, Vector3, TransformNode, Quaternion } from '@babylonjs/core'
import { Vector3 as DclVector3 } from '@dcl/ecs-math'
import { SceneContext } from './SceneContext'
import { EcsEntity } from './EcsEntity'
import { GizmoType } from '../../utils/gizmo'
import { FreeGizmo, PositionGizmo, RotationGizmo, ScaleGizmo, IGizmoTransformer } from './gizmos'
import { snapPosition, snapRotation, snapScale } from './snap-manager'

export function createGizmoManager(context: SceneContext) {
  // events
  const events = mitt<{ change: void }>()

  // Initialize state
  let selectedEntities: EcsEntity[] = []
  let isEnabled = true
  let currentTransformer: IGizmoTransformer | null = null

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

  // Clean up all gizmo observers
  function cleanupAllGizmoObservers() {
    // Don't clean up position gizmo - it manages its own observables
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

  const setupFreeTransformerChangeHandler = (transformer: IGizmoTransformer) => {
    transformer.onChange(() => {
      selectedEntities.forEach(updateEntityPosition)
      void context.operations.dispatch()
    })
  }

  setupFreeTransformerChangeHandler(freeTransformer)

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
        // restoreParents()
        gizmoManager.attachToNode(null)
      }
    },
    restoreParents,
    addEntity(entity: EcsEntity) {
      if (selectedEntities.includes(entity) || !isEnabled) return
      // restoreParents()
      selectedEntities.push(entity)
      updateGizmoPosition()

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
      // restoreParents()
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
      return [GizmoType.POSITION, GizmoType.ROTATION, GizmoType.SCALE, GizmoType.FREE] as const
    },
    setGizmoType(type: GizmoType) {
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
          console.log('=== SET GIZMO TYPE === position')
          currentTransformer = positionTransformer
          currentTransformer.setup()
          currentTransformer.setEntities(selectedEntities)

          // Set up callbacks for ECS updates
          if ('setUpdateCallbacks' in currentTransformer) {
            console.log('=== SET UPDATE CALLBACKS ===')
            ;(currentTransformer as any).setUpdateCallbacks(updateEntityPosition, () => context.operations.dispatch())
          }

          // Set world alignment
          if ('setWorldAligned' in currentTransformer) {
            ;(currentTransformer as any).setWorldAligned(isGizmoWorldAligned)
          }

          gizmoManager.positionGizmoEnabled = true

          // Enable the position gizmo to set up its observables
          if ('enable' in currentTransformer) {
            ;(currentTransformer as any).enable()
          }

          break
        }
        case GizmoType.ROTATION: {
          currentTransformer = rotationTransformer
          currentTransformer.setup()
          currentTransformer.setEntities(selectedEntities)

          // Set up callbacks for ECS updates
          if ('setUpdateCallbacks' in currentTransformer) {
            console.log('=== SET UPDATE CALLBACKS ===')
            ;(currentTransformer as any).setUpdateCallbacks(
              updateEntityRotation,
              updateEntityPosition,
              () => context.operations.dispatch(),
              context
            )
          }

          // Set world alignment
          if ('setWorldAligned' in currentTransformer) {
            ;(currentTransformer as any).setWorldAligned(isGizmoWorldAligned)
          }

          gizmoManager.rotationGizmoEnabled = true

          // Enable the rotation gizmo to set up its observables
          if ('enable' in currentTransformer) {
            ;(currentTransformer as any).enable()
          }

          break
        }
        case GizmoType.SCALE: {
          currentTransformer = scaleTransformer
          currentTransformer.setup()
          currentTransformer.setEntities(selectedEntities)

          // Set up callbacks for ECS updates
          if ('setUpdateCallbacks' in currentTransformer) {
            ;(currentTransformer as any).setUpdateCallbacks(updateEntityScale, () => context.operations.dispatch())
          }

          // Set world alignment
          if ('setWorldAligned' in currentTransformer) {
            ;(currentTransformer as any).setWorldAligned(isGizmoWorldAligned)
          }

          gizmoManager.scaleGizmoEnabled = true

          // Enable the scale gizmo to set up its observables
          if ('enable' in currentTransformer) {
            ;(currentTransformer as any).enable()
          }

          break
        }
        case GizmoType.FREE: {
          currentTransformer = freeTransformer
          currentTransformer.setup()
          currentTransformer.setEntities(selectedEntities)

          // Set up callback to update gizmo position after drag ends
          if ('setOnDragEndCallback' in currentTransformer) {
            ;(currentTransformer as any).setOnDragEndCallback(() => {
              updateGizmoPosition()
            })
          }

          const node = getGizmoNode()
          currentTransformer.onDragStart(selectedEntities, node)
          currentTransformer.update(selectedEntities, node)
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
      if (currentTransformer && 'setWorldAligned' in currentTransformer) {
        ;(currentTransformer as any).setWorldAligned(value)
      }
      events.emit('change')
    },
    isGizmoWorldAlignmentDisabled() {
      return isGizmoWorldAlignmentDisabled
    },
    onChange(cb: () => void) {
      events.on('change', cb)
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
        events.off('change', cb)
      }
    }
  }
}

export type Gizmos = ReturnType<typeof createGizmoManager>
