import * as BABYLON from '@babylonjs/core'

import { EcsEntity } from '../decentraland/EcsEntity'
import { snapManager } from '../decentraland/snap-manager'
import { keyState, Keys } from '../decentraland/keys'
import { getAncestors, isAncestor, mapNodes } from '../../sdk/nodes'

let isSnapEnabled = snapManager.isEnabled()
let isShiftKeyDown = false
let clickStartTimer: ReturnType<typeof setTimeout>
let isDragging = false

export function initKeyboard(canvas: HTMLCanvasElement, scene: BABYLON.Scene) {
  canvas.addEventListener('keydown', (e) => {
    keyState[Keys.KEY_SHIFT] = e.shiftKey
    keyState[Keys.KEY_CTRL] = e.ctrlKey
    keyState[e.keyCode] = true
    if (e.shiftKey) {
      isSnapEnabled = snapManager.toggle()
      isShiftKeyDown = true
    }
  })

  canvas.addEventListener('keyup', (e) => {
    if (isShiftKeyDown) {
      snapManager.setEnabled(!isSnapEnabled)
      isShiftKeyDown = false
    }

    keyState[Keys.KEY_SHIFT] = e.shiftKey
    keyState[Keys.KEY_CTRL] = e.ctrlKey
    keyState[e.keyCode] = false
  })

  // When the canvas lost the focus, clear the special keys state
  canvas.addEventListener('blur', () => {
    keyState[Keys.KEY_SHIFT] = false
    keyState[Keys.KEY_CTRL] = false
  })

  // Event to store the ctrlKey when the canvas has lost the focus
  canvas.addEventListener('contextmenu', (e) => {
    keyState[Keys.KEY_CTRL] = e.ctrlKey
  })

  scene.onPointerObservable.add((e) => {
    if (e.type === BABYLON.PointerEventTypes.POINTERDOWN) {
      const evt = e.event as PointerEvent
      scene.getEngine().getRenderingCanvas()!.focus()
      if (evt.button === 0) interactWithScene(scene, 'pointerDown', evt.offsetX, evt.offsetY, evt.pointerId)
    } else if (e.type === BABYLON.PointerEventTypes.POINTERUP) {
      const evt = e.event as PointerEvent
      if (evt.button === 0) interactWithScene(scene, 'pointerUp', evt.offsetX, evt.offsetY, evt.pointerId)
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

export function interactWithScene(
  scene: BABYLON.Scene,
  pointerEvent: 'pointerUp' | 'pointerDown',
  x: number,
  y: number,
  _pointerId: number
) {
  const pickingResult = scene.pick(x, y, void 0, false)

  const mesh = pickingResult!.pickedMesh

  const entity = mesh && findParentEntity(mesh)

  if (entity && pointerEvent === 'pointerDown') {
    clickStartTimer = setTimeout(() => {
      isDragging = true
    }, 150) // 150ms to detect if the user is dragging
  } else if (entity && pointerEvent === 'pointerUp' && !isDragging) {
    const context = entity.context.deref()!
    const { operations, engine, editorComponents } = context
    const ancestors = getAncestors(engine, entity.entityId)
    const nodes = mapNodes(engine, (node) => (isAncestor(ancestors, node.entity) ? { ...node, open: true } : node))
    operations.updateValue(editorComponents.Nodes, engine.RootEntity, { value: nodes })
    operations.updateSelectedEntity(entity.entityId, !!keyState[Keys.KEY_CTRL])
    void operations.dispatch()
  }

  // Clear isDragging flag each pointerUp
  if (pointerEvent === 'pointerUp') {
    clearTimeout(clickStartTimer)
    isDragging = false
  }
}
