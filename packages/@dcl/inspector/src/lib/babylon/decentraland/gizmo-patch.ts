import { GizmoManager, PlaneRotationGizmo, RotationGizmo } from '@babylonjs/core'
import { Vector3, Color3, PointerInfo } from '@babylonjs/core'
import {
  Epsilon,
  Quaternion,
  Logger,
  TmpVectors,
  PointerDragBehavior,
  Gizmo,
  Matrix,
  Observable,
  StandardMaterial,
  Mesh,
  CreatePlane,
  ShaderMaterial,
  Effect
} from '@babylonjs/core'

/*
    There's a bug in PlaneRotationGizmo's constructor that breaks rotation about world axes.
    
    We provide patched version of PlaneRotationGizmo.
    Patched PlaneRotationGizmo is used by patched version of RotationGizmo.
    Finally, patched RotationGizmo is used by patched version of GizmoManager.

    The code is copied mostly verbatim, with "anys" sprinkled here in there to appease type checker.
    Actual patch is marked with PATCH FIX comment.
*/

export class PatchedPlaneRotationGizmo extends PlaneRotationGizmo {
  constructor(
    planeNormal: any,
    color = Color3.Gray(),
    gizmoLayer: any,
    tessellation = 32,
    parent: any = null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    useEulerRotation = false,
    thickness = 1
  ) {
    let _a
    super(gizmoLayer)
    this._pointerObserver = null
    /**
     * Rotation distance in radians that the gizmo will snap to (Default: 0)
     */
    this.snapDistance = 0
    /**
     * Event that fires each time the gizmo snaps to a new location.
     * * snapDistance is the the change in distance
     */
    this.onSnapObservable = new Observable()
    /**
     * Accumulated relative angle value for rotation on the axis. Reset to 0 when a dragStart occurs
     */
    this.angle = 0
    this._isEnabled = true
    this._parent = null
    this._dragging = false
    this._angles = new Vector3()
    this._parent = parent
    // Create Material
    this._coloredMaterial = new StandardMaterial('', gizmoLayer.utilityLayerScene)
    this._coloredMaterial.diffuseColor = color
    this._coloredMaterial.specularColor = color.subtract(new Color3(0.1, 0.1, 0.1))
    this._hoverMaterial = new StandardMaterial('', gizmoLayer.utilityLayerScene)
    this._hoverMaterial.diffuseColor = Color3.Yellow()
    this._disableMaterial = new StandardMaterial('', gizmoLayer.utilityLayerScene)
    this._disableMaterial.diffuseColor = Color3.Gray()
    this._disableMaterial.alpha = 0.4
    // Build mesh on root node
    this._gizmoMesh = new Mesh('', gizmoLayer.utilityLayerScene)
    const { rotationMesh, collider } = this._createGizmoMesh(this._gizmoMesh, thickness, tessellation)
    // Setup Rotation Circle
    this._rotationDisplayPlane = CreatePlane(
      'rotationDisplay',
      { size: 0.6, updatable: false },
      this.gizmoLayer.utilityLayerScene
    )
    this._rotationDisplayPlane.rotation.z = Math.PI * 0.5
    this._rotationDisplayPlane.parent = this._gizmoMesh
    this._rotationDisplayPlane.setEnabled(false)
    Effect.ShadersStore['rotationGizmoVertexShader'] = PlaneRotationGizmo._RotationGizmoVertexShader
    Effect.ShadersStore['rotationGizmoFragmentShader'] = PlaneRotationGizmo._RotationGizmoFragmentShader
    this._rotationShaderMaterial = new ShaderMaterial(
      'shader',
      this.gizmoLayer.utilityLayerScene,
      {
        vertex: 'rotationGizmo',
        fragment: 'rotationGizmo'
      },
      {
        attributes: ['position', 'uv'],
        uniforms: ['worldViewProjection', 'angles']
      }
    )
    this._rotationShaderMaterial.backFaceCulling = false
    this._rotationDisplayPlane.material = this._rotationShaderMaterial
    this._rotationDisplayPlane.visibility = 0.999
    this._gizmoMesh.lookAt(this._rootMesh.position.add(planeNormal))
    this._rootMesh.addChild(this._gizmoMesh, Gizmo.PreserveScaling)
    this._gizmoMesh.scaling.scaleInPlace(1 / 3)
    // Add drag behavior to handle events when the gizmo is dragged
    this.dragBehavior = new PointerDragBehavior({ dragPlaneNormal: planeNormal })
    this.dragBehavior.moveAttached = false
    this.dragBehavior.maxDragAngle = PlaneRotationGizmo.MaxDragAngle
    this.dragBehavior._useAlternatePickedPointAboveMaxDragAngle = true
    this._rootMesh.addBehavior(this.dragBehavior)
    // Closures for drag logic
    const lastDragPosition = new Vector3()
    const rotationMatrix = new Matrix()
    const planeNormalTowardsCamera = new Vector3()
    let localPlaneNormalTowardsCamera = new Vector3()
    this.dragBehavior.onDragStartObservable.add((e) => {
      if (this.attachedNode) {
        lastDragPosition.copyFrom(e.dragPlanePoint)
        this._rotationDisplayPlane.setEnabled(true)
        this._rotationDisplayPlane.getWorldMatrix().invertToRef(rotationMatrix)
        Vector3.TransformCoordinatesToRef(e.dragPlanePoint, rotationMatrix, lastDragPosition)
        this._angles.x = Math.atan2(lastDragPosition.y, lastDragPosition.x) + Math.PI
        this._angles.y = 0
        this._angles.z = this.updateGizmoRotationToMatchAttachedMesh ? 1 : 0
        this._dragging = true
        lastDragPosition.copyFrom(e.dragPlanePoint)
        this._rotationShaderMaterial.setVector3('angles', this._angles)
        this.angle = 0
      }
    })
    this.dragBehavior.onDragEndObservable.add(() => {
      this._dragging = false
      this._rotationDisplayPlane.setEnabled(false)
    })
    const tmpSnapEvent = { snapDistance: 0 }
    let currentSnapDragDistance = 0
    const tmpMatrix = new Matrix()
    const amountToRotate = new Quaternion()
    this.dragBehavior.onDragObservable.add((event) => {
      if (this.attachedNode) {
        // Calc angle over full 360 degree (https://stackoverflow.com/questions/43493711/the-angle-between-two-3d-vectors-with-a-result-range-0-360)
        const nodeScale = new Vector3(1, 1, 1)
        const nodeQuaternion = new Quaternion(0, 0, 0, 1)
        const nodeTranslation = new Vector3(0, 0, 0)
        this._handlePivot()
        this.attachedNode.getWorldMatrix().decompose(nodeScale, nodeQuaternion, nodeTranslation)
        // uniform scaling of absolute value of components
        // (-1,1,1) is uniform but (1,1.001,1) is not
        const uniformScaling =
          Math.abs(Math.abs(nodeScale.x) - Math.abs(nodeScale.y)) <= Epsilon &&
          Math.abs(Math.abs(nodeScale.x) - Math.abs(nodeScale.z)) <= Epsilon
        if (!uniformScaling && this.updateGizmoRotationToMatchAttachedMesh) {
          Logger.Warn(
            'Unable to use a rotation gizmo matching mesh rotation with non uniform scaling. Use uniform scaling or set updateGizmoRotationToMatchAttachedMesh to false.'
          )
          return
        }
        nodeQuaternion.normalize()
        const nodeTranslationForOperation = this.updateGizmoPositionToMatchAttachedMesh
          ? nodeTranslation
          : this._rootMesh.absolutePosition
        const newVector = event.dragPlanePoint.subtract(nodeTranslationForOperation).normalize()
        const originalVector = lastDragPosition.subtract(nodeTranslationForOperation).normalize()
        const cross = Vector3.Cross(newVector, originalVector)
        const dot = Vector3.Dot(newVector, originalVector)
        let angle = Math.atan2(cross.length(), dot)
        planeNormalTowardsCamera.copyFrom(planeNormal)
        localPlaneNormalTowardsCamera.copyFrom(planeNormal)
        if (this.updateGizmoRotationToMatchAttachedMesh) {
          nodeQuaternion.toRotationMatrix(rotationMatrix)
          localPlaneNormalTowardsCamera = Vector3.TransformCoordinates(planeNormalTowardsCamera, rotationMatrix)
        }
        // Flip up vector depending on which side the camera is on
        let cameraFlipped = false
        if (gizmoLayer.utilityLayerScene.activeCamera) {
          const camVec = gizmoLayer.utilityLayerScene.activeCamera.position
            .subtract(nodeTranslationForOperation)
            .normalize()
          if (Vector3.Dot(camVec, localPlaneNormalTowardsCamera) > 0) {
            planeNormalTowardsCamera.scaleInPlace(-1)
            localPlaneNormalTowardsCamera.scaleInPlace(-1)
            cameraFlipped = true
          }
        }
        const halfCircleSide = Vector3.Dot(localPlaneNormalTowardsCamera, cross) > 0.0
        if (halfCircleSide) {
          angle = -angle
        }
        // Snapping logic
        let snapped = false
        if (this.snapDistance !== 0) {
          currentSnapDragDistance += angle
          if (Math.abs(currentSnapDragDistance) > this.snapDistance) {
            let dragSteps = Math.floor(Math.abs(currentSnapDragDistance) / this.snapDistance)
            if (currentSnapDragDistance < 0) {
              dragSteps *= -1
            }
            currentSnapDragDistance = currentSnapDragDistance % this.snapDistance
            angle = this.snapDistance * dragSteps
            snapped = true
          } else {
            angle = 0
          }
        }
        // Convert angle and axis to quaternion (http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm)
        const quaternionCoefficient = Math.sin(angle / 2)
        amountToRotate.set(
          planeNormalTowardsCamera.x * quaternionCoefficient,
          planeNormalTowardsCamera.y * quaternionCoefficient,
          planeNormalTowardsCamera.z * quaternionCoefficient,
          Math.cos(angle / 2)
        )
        // If the meshes local scale is inverted (eg. loaded gltf file parent with z scale of -1) the rotation needs to be inverted on the y axis
        if (tmpMatrix.determinant() > 0) {
          const tmpVector = new Vector3()
          amountToRotate.toEulerAnglesToRef(tmpVector)
          Quaternion.RotationYawPitchRollToRef(tmpVector.y, -tmpVector.x, -tmpVector.z, amountToRotate)
        }
        if (this.updateGizmoRotationToMatchAttachedMesh) {
          // Rotate selected mesh quaternion over fixed axis
          nodeQuaternion.multiplyToRef(amountToRotate, nodeQuaternion)
          // recompose matrix
          Matrix.ComposeToRef(nodeScale, nodeQuaternion, nodeTranslation, this.attachedNode.getWorldMatrix())
        } else {
          /* PATCH FIX */
          /* Original is:
                    amountToRotate.toRotationMatrix(TmpVectors.Matrix[0]);
                    TmpVectors.Matrix[0].multiplyToRef(this.attachedNode.getWorldMatrix(), this.attachedNode.getWorldMatrix());
                    Wrong order of matrix multiplication!
                    */
          amountToRotate.toRotationMatrix(TmpVectors.Matrix[0])
          const translation = this.attachedNode.getWorldMatrix().getTranslation()
          this.attachedNode.getWorldMatrix().multiplyToRef(TmpVectors.Matrix[0], this.attachedNode.getWorldMatrix())
          this.attachedNode.getWorldMatrix().setTranslation(translation)
        }
        lastDragPosition.copyFrom(event.dragPlanePoint)
        if (snapped) {
          tmpSnapEvent.snapDistance = angle
          this.onSnapObservable.notifyObservers(tmpSnapEvent)
        }
        this._angles.y += angle
        this.angle += cameraFlipped ? -angle : angle
        this._rotationShaderMaterial.setVector3('angles', this._angles)
        this._matrixChanged()
      }
    })
    const light = gizmoLayer._getSharedGizmoLight()
    light.includedOnlyMeshes = light.includedOnlyMeshes.concat(this._rootMesh.getChildMeshes(false))
    const cache = {
      colliderMeshes: [collider],
      gizmoMeshes: [rotationMesh],
      material: this._coloredMaterial,
      hoverMaterial: this._hoverMaterial,
      disableMaterial: this._disableMaterial,
      active: false,
      dragBehavior: this.dragBehavior
    }
    ;(_a = this._parent) === null || _a === void 0
      ? void 0
      : (_a as RotationGizmo).addToAxisCache(this._gizmoMesh, cache)
    this._pointerObserver = gizmoLayer.utilityLayerScene.onPointerObservable.add((pointerInfo: PointerInfo) => {
      let _a
      if (this._customMeshSet) {
        return
      }
      // updating here the maxangle because ondragstart is too late (value already used) and the updated value is not taken into account
      this.dragBehavior.maxDragAngle = PlaneRotationGizmo.MaxDragAngle
      this._isHovered = !!(
        cache.colliderMeshes.indexOf(
          ((_a = pointerInfo === null || pointerInfo === void 0 ? void 0 : pointerInfo.pickInfo) === null ||
          _a === void 0
            ? void 0
            : _a.pickedMesh) as Mesh
        ) !== -1
      )
      if (!this._parent) {
        const material = cache.dragBehavior.enabled
          ? this._isHovered || this._dragging
            ? this._hoverMaterial
            : this._coloredMaterial
          : this._disableMaterial
        this._setGizmoMeshMaterial(cache.gizmoMeshes, material)
      }
    })
    this.dragBehavior.onEnabledObservable.add((newState) => {
      this._setGizmoMeshMaterial(cache.gizmoMeshes, newState ? this._coloredMaterial : this._disableMaterial)
    })
  }
}

export class PatchedRotationGizmo extends RotationGizmo {
  constructor(
    gizmoLayer: any,
    tessellation = 32,
    useEulerRotation = false,
    thickness = 1,
    gizmoManager: any,
    options: any
  ) {
    super(gizmoLayer)
    /** Fires an event when any of it's sub gizmos are dragged */
    this.onDragStartObservable = new Observable()
    /** Fires an event when any of it's sub gizmos are released from dragging */
    this.onDragEndObservable = new Observable()
    this._observables = []
    /** Node Caching for quick lookup */
    this._gizmoAxisCache = new Map()
    const xColor =
      options && options.xOptions && options.xOptions.color ? options.xOptions.color : Color3.Red().scale(0.5)
    const yColor =
      options && options.yOptions && options.yOptions.color ? options.yOptions.color : Color3.Green().scale(0.5)
    const zColor =
      options && options.zOptions && options.zOptions.color ? options.zOptions.color : Color3.Blue().scale(0.5)
    this.xGizmo = new PatchedPlaneRotationGizmo(
      new Vector3(1, 0, 0),
      xColor,
      gizmoLayer,
      tessellation,
      this,
      useEulerRotation,
      thickness
    )
    this.yGizmo = new PatchedPlaneRotationGizmo(
      new Vector3(0, 1, 0),
      yColor,
      gizmoLayer,
      tessellation,
      this,
      useEulerRotation,
      thickness
    )
    this.zGizmo = new PatchedPlaneRotationGizmo(
      new Vector3(0, 0, 1),
      zColor,
      gizmoLayer,
      tessellation,
      this,
      useEulerRotation,
      thickness
    )
    // Relay drag events and set update scale
    ;[this.xGizmo, this.yGizmo, this.zGizmo].forEach((gizmo) => {
      //must set updateScale on each gizmo, as setting it on root RotationGizmo doesnt prevent individual gizmos from updating
      //currently updateScale is a property with no getter/setter, so no good way to override behavior at runtime, so we will at least set it on startup
      if (options && options.updateScale !== undefined) {
        gizmo.updateScale = options.updateScale
      }
      gizmo.dragBehavior.onDragStartObservable.add(() => {
        this.onDragStartObservable.notifyObservers({})
      })
      gizmo.dragBehavior.onDragEndObservable.add(() => {
        this.onDragEndObservable.notifyObservers({})
      })
    })
    this.attachedMesh = null
    this.attachedNode = null
    if (gizmoManager) {
      gizmoManager.addToAxisCache(this._gizmoAxisCache)
    } else {
      // Only subscribe to pointer event if gizmoManager isnt
      Gizmo.GizmoAxisPointerObserver(gizmoLayer, this._gizmoAxisCache)
    }
  }
}

export class PatchedGizmoManager extends GizmoManager {
  protected _gizmosEnabled: {
    positionGizmo: boolean
    rotationGizmo: boolean
    scaleGizmo: boolean
    boundingBoxGizmo: boolean
    freeGizmo: boolean
  } = {
    positionGizmo: false,
    rotationGizmo: false,
    scaleGizmo: false,
    boundingBoxGizmo: false,
    freeGizmo: false
  }

  set rotationGizmoEnabled(value: boolean) {
    if (value) {
      if (!this.gizmos.rotationGizmo) {
        this.gizmos.rotationGizmo = new PatchedRotationGizmo(
          this._defaultUtilityLayer,
          32,
          false,
          this._thickness,
          this,
          undefined
        )
      }
      if (this._attachedNode) {
        this.gizmos.rotationGizmo.attachedNode = this._attachedNode
      } else {
        this.gizmos.rotationGizmo.attachedMesh = this._attachedMesh
      }
    } else if (this.gizmos.rotationGizmo) {
      this.gizmos.rotationGizmo.attachedNode = null
    }
    this._gizmosEnabled.rotationGizmo = value
  }

  get rotationGizmoEnabled() {
    return this._gizmosEnabled.rotationGizmo
  }

  set freeGizmoEnabled(value: boolean) {
    this._gizmosEnabled.freeGizmo = value
  }

  get freeGizmoEnabled(): boolean {
    return this._gizmosEnabled.freeGizmo
  }
}
