import {
  AbstractMesh,
  ArcRotateCamera,
  Axis,
  BoundingBox,
  BoundingInfo,
  Color3,
  IAxisDragGizmo,
  Mesh,
  MeshBuilder,
  PositionGizmo,
  Scene,
  Space,
  StandardMaterial,
  TransformNode,
  Vector3,
  VertexBuffer
} from '@babylonjs/core'
import { memoize } from '../../logic/once'
import { Layout } from '../../utils/layout'
import { GridMaterial } from '@babylonjs/materials'
import { PARCEL_SIZE, GROUND_MESH_PREFIX } from '../../utils/scene'

function disableGizmo(gizmo: IAxisDragGizmo) {
  gizmo.dragBehavior.detach()
  copyColors(gizmo.disableMaterial, gizmo.hoverMaterial)
  copyColors(gizmo.disableMaterial, gizmo.coloredMaterial)
}

function copyColors(source: StandardMaterial, target: StandardMaterial) {
  target.diffuseColor = source.diffuseColor
  target.ambientColor = source.ambientColor
  target.emissiveColor = source.emissiveColor
  target.specularColor = source.specularColor
  target.alpha = source.alpha
}

function center(scene: Scene, layout: Layout) {
  if (!scene.activeCamera) return
  const { base, parcels } = layout
  const minX = Math.min(...parcels.map((parcel) => parcel.x))
  const minY = Math.min(...parcels.map((parcel) => parcel.y))
  const maxX = Math.max(...parcels.map((parcel) => parcel.x)) + 1
  const maxY = Math.max(...parcels.map((parcel) => parcel.y)) + 1
  const x = (minX + maxX) / 2 - base.x
  const y = (minY + maxY) / 2 - base.y
  const center = new Vector3(x * PARCEL_SIZE, 0, y * PARCEL_SIZE)
  const camera = scene.activeCamera! as ArcRotateCamera
  camera.setTarget(center)
  const size = center.length()
  camera.upperRadiusLimit = camera.radius = size * 2
}

export const getLayoutManager = memoize((scene: Scene) => {
  let layout: Layout | null = null

  const layoutNode = new TransformNode('layout', scene)
  const positionGizmo = new PositionGizmo(undefined, 0.5)
  positionGizmo.attachedNode = layoutNode

  disableGizmo(positionGizmo.xGizmo)
  disableGizmo(positionGizmo.yGizmo)
  disableGizmo(positionGizmo.zGizmo)

  const grid = new GridMaterial('layout_grid', scene)
  grid.gridRatio = 1
  grid.majorUnitFrequency = 4
  grid.lineColor = Color3.FromHexString('#ffffff')
  grid.mainColor = Color3.FromHexString('#504E58')
  grid.zOffset = -0.1
  grid.zOffsetUnits = 3
  grid.opacity = 0.9

  const planes: Mesh[] = []

  function clear() {
    let plane = planes.pop()
    while (plane) {
      plane.dispose(false, true)
      plane = planes.pop()
    }
  }

  function isSameLayout(a: Layout, b: Layout) {
    if (a.base.x !== b.base.x || a.base.y !== b.base.y) return false
    if (a.parcels.length !== b.parcels.length) return false
    for (let i = 0; i < a.parcels.length; i++) {
      if (a.parcels[i].x !== b.parcels[i].x || a.parcels[i].y !== b.parcels[i].y) return false
    }
    return true
  }

  function getLayout() {
    return layout
  }

  function setLayout(_layout: Layout) {
    if (layout && isSameLayout(layout, _layout)) return
    clear()
    layout = _layout
    fill(layout)
    center(scene, layout)
  }

  function fill(layout: Layout) {
    const { base, parcels } = layout
    for (const parcel of parcels) {
      const x = parcel.x - base.x
      const y = parcel.y - base.y

      const plane = MeshBuilder.CreatePlane(`${GROUND_MESH_PREFIX}_${x}_${y}`, { size: PARCEL_SIZE }, scene)
      plane.parent = layoutNode
      plane.position.x = x * PARCEL_SIZE
      plane.position.z = y * PARCEL_SIZE
      plane.position.y = 0
      plane.rotate(Axis.X, Math.PI / 2, Space.WORLD)
      plane.translate(Axis.X, PARCEL_SIZE / 2, Space.WORLD)
      plane.translate(Axis.Z, PARCEL_SIZE / 2, Space.WORLD)
      plane.isPickable = false
      plane.material = grid
      plane.setBoundingInfo(
        new BoundingInfo(
          plane.getBoundingInfo().boundingBox.minimum.add(new Vector3(0, 0, -Math.log2(parcels.length + 1) * 20)),
          plane.getBoundingInfo().boundingBox.maximum.add(new Vector3(0, 0, 0.1))
        )
      )
      planes.push(plane)
    }
  }

  function isEntityOutsideLayout(entity: AbstractMesh) {
    // Combine all planes' bounding boxes into a single bounding box
    const combinedMin = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE)
    const combinedMax = new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE)

    for (const plane of planes) {
      const planeBoundingBox = plane.getBoundingInfo().boundingBox
      combinedMin.minimizeInPlace(planeBoundingBox.minimumWorld)
      combinedMax.maximizeInPlace(planeBoundingBox.maximumWorld)
      planeBoundingBox.dispose()
    }

    const combinedBoundingBox = new BoundingBox(combinedMin, combinedMax)

    // Get the vertices of the entity
    const vertexData = entity.getVerticesData(VertexBuffer.PositionKind) || []
    const worldMatrix = entity.getWorldMatrix()

    // Check each vertex of the entity
    for (let i = 0; i < vertexData.length; i += 3) {
      // Transform the vertex to world space
      const vertex = Vector3.TransformCoordinates(
        new Vector3(vertexData[i], vertexData[i + 1], vertexData[i + 2]),
        worldMatrix
      )

      // Check if the vertex lies outside the combined bounding box
      if (!combinedBoundingBox.intersectsPoint(vertex)) {
        return true // Entity is partially or completely outside the combined plane
      }
    }

    // If we reach here, all vertices are inside the combined bounding box
    return false // Entity is completely inside the combined plane
  }

  return {
    getLayout,
    setLayout,
    isEntityOutsideLayout
  }
})
