import {
  ArcRotateCamera,
  Axis,
  Color3,
  IAxisDragGizmo,
  Mesh,
  MeshBuilder,
  PositionGizmo,
  Scene,
  Space,
  StandardMaterial,
  TransformNode,
  Vector3
} from '@babylonjs/core'
import { memoize } from '../../logic/once'
import { Layout } from '../../sdk/layout'
import { GridMaterial } from '@babylonjs/materials'
import { PARCEL_SIZE } from '../setup'

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
  let layout: Layout = {
    base: { x: 0, y: 0 },
    parcels: [{ x: 0, y: 0 }]
  }

  const layoutNode = new TransformNode('layout', scene)
  const positionGizmo = new PositionGizmo()
  positionGizmo.attachedNode = layoutNode

  disableGizmo(positionGizmo.xGizmo)
  disableGizmo(positionGizmo.yGizmo)
  disableGizmo(positionGizmo.zGizmo)

  const grid = new GridMaterial('layout_grid', scene)
  grid.gridRatio = 1
  grid.majorUnitFrequency = 4
  grid.lineColor = Color3.FromHexString('#ffffff')
  grid.mainColor = Color3.FromHexString('#504E58')
  grid.zOffset = -1

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
    if (isSameLayout(layout, _layout)) return
    clear()
    layout = _layout
    fill()
    center(scene, layout)
  }

  function fill() {
    const { base, parcels } = layout
    for (const parcel of parcels) {
      const x = parcel.x - base.x
      const y = parcel.y - base.y

      const plane = MeshBuilder.CreatePlane(`ground_plane_${x}_${y}`, { size: PARCEL_SIZE }, scene)
      plane.parent = layoutNode
      plane.position.x = x * PARCEL_SIZE
      plane.position.z = y * PARCEL_SIZE
      plane.position.y = 0
      plane.rotate(Axis.X, Math.PI / 2, Space.WORLD)
      plane.translate(Axis.X, PARCEL_SIZE / 2, Space.WORLD)
      plane.translate(Axis.Z, PARCEL_SIZE / 2, Space.WORLD)
      plane.isPickable = false
      plane.material = grid
      planes.push(plane)
    }
  }

  return {
    getLayout,
    setLayout
  }
})
