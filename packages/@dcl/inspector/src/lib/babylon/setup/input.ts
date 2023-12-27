import * as BABYLON from '@babylonjs/core'

import { EcsEntity } from '../decentraland/EcsEntity'
import { snapManager } from '../decentraland/snap-manager'
import { keyState, Keys } from '../decentraland/keys'
import { getAncestors, isAncestor, mapNodes } from '../../sdk/nodes'
import { store } from '../../../redux/store'

let isSnapEnabled = snapManager.isEnabled()
let isPickEnabled = true

export function initKeyboard(canvas: HTMLCanvasElement, scene: BABYLON.Scene) {
  canvas.addEventListener('keydown', (e) => {
    keyState[Keys.KEY_SHIFT] = e.shiftKey
    keyState[Keys.KEY_CTRL] = e.ctrlKey
    keyState[e.keyCode] = true
    if (e.shiftKey) {
      isSnapEnabled = snapManager.toggle()
    }
  })

  canvas.addEventListener('keyup', (e) => {
    snapManager.setEnabled(!isSnapEnabled)

    keyState[Keys.KEY_SHIFT] = e.shiftKey
    keyState[Keys.KEY_CTRL] = e.ctrlKey
    keyState[e.keyCode] = false
  })

  scene.onPointerObservable.add((e) => {
    if (e.type === BABYLON.PointerEventTypes.POINTERDOWN) {
      const evt = e.event as PointerEvent
      scene.getEngine().getRenderingCanvas()!.focus()
      if (evt.button === 0) interactWithScene(scene, 'pointerDown', evt.offsetX, evt.offsetY, evt.pointerId)
    } else if (e.type === BABYLON.PointerEventTypes.POINTERUP) {
      const evt = e.event as PointerEvent
      if (evt.button === 0) interactWithScene(scene, 'pointerUp', evt.offsetX, evt.offsetY, evt.pointerId)
    } else if (e.type === BABYLON.PointerEventTypes.POINTERMOVE) {
      const evt = e.event as PointerEvent
      togglePick(getEntityUnderCursor(scene, evt.offsetX, evt.offsetY))
    }
  })
}

function isEcsEntity(x: any): x is EcsEntity {
  return 'isDCLEntity' in x
}

function findParentEntity<T extends BABYLON.Node & { isDCLEntity?: boolean }>(node: T): EcsEntity | null {
  // Find the next entity parent to dispatch the event
  let parent: BABYLON.Node | null = node.parent

  while (parent && !isEcsEntity(parent)) {
    parent = parent.parent

    // If the element has no parent, stop execution
    if (!parent) return null
  }

  return (parent as any) || null
}

export function getEntityUnderCursor(
  scene: BABYLON.Scene,
  x: number,
  y: number
): EcsEntity | null {
  const pickingResult = scene.pick(x, y, void 0, false)
  const mesh = pickingResult!.pickedMesh
  const entity = mesh && findParentEntity(mesh)

  return entity
}

export function interactWithScene(
  scene: BABYLON.Scene,
  pointerEvent: 'pointerUp' | 'pointerDown',
  x: number,
  y: number,
  _pointerId: number
) {
  if (!isPickEnabled) return

  const entity = getEntityUnderCursor(scene, x, y)
  if (entity && pointerEvent === 'pointerDown') {
    const context = entity.context.deref()!
    const { operations, engine, editorComponents } = context
    const ancestors = getAncestors(engine, entity.entityId)
    const nodes = mapNodes(engine, (node) => (isAncestor(ancestors, node.entity) ? { ...node, open: true } : node))
    operations.updateValue(editorComponents.Nodes, engine.RootEntity, { value: nodes })
    operations.updateSelectedEntity(entity.entityId)
    void operations.dispatch()
  }
}

export function togglePick(entity: EcsEntity | null): boolean {
  const { session } = store.getState().app
  isPickEnabled = !entity || !session.participants.find(($) => $.selectedEntity === entity.entityId)

  // DEMO: random stuff just for demo....
  document.body.style.cursor = isPickEnabled ? 'inherit' : 'not-allowed'

  return isPickEnabled
}
