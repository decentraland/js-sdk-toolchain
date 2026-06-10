// Browser-side harness (bundled at runtime by the ui-preview command against the
// scene's own @dcl/sdk). Drives the global engine that the scene's
// ReactEcsRenderer.setUiRenderer(...) targets, then reads the resulting UI tree
// out as plain data and (in dom.ts) renders it to the DOM.
import { engine as globalEngine, components, type IEngine } from '@dcl/sdk/ecs'

export interface UiNode {
  entity: number
  parent: number
  rightOf: number
  transform: any
  text: any
  background: any
  input: any
  dropdown: any
  interactive: boolean
  children: UiNode[]
}

export interface PreviewRenderer {
  tick(dt: number): Promise<void>
  read(): UiNode[]
  click(entity: number): void
  setCanvas?(width: number, height: number, devicePixelRatio?: number): void
}

const ROOT_ENTITY = 0

function makeReaderAndClicker(engine: IEngine): Pick<PreviewRenderer, 'read' | 'click'> {
  const UiTransform = components.UiTransform(engine)
  const UiText = components.UiText(engine)
  const UiBackground = components.UiBackground(engine)
  const UiInput = components.UiInput(engine)
  const UiDropdown = components.UiDropdown(engine)
  const PointerEvents = components.PointerEvents(engine)
  const PointerEventsResult = components.PointerEventsResult(engine)

  // The input system only fires handlers for commands whose timestamp is newer
  // than the previous frame's max, so use a monotonic clock.
  let pointerClock = 1

  function click(entity: number): void {
    const base = { button: 0 /* IA_POINTER */, hit: undefined, analog: undefined, tickNumber: 0 }
    PointerEventsResult.addValue(entity as any, { ...base, state: 1 /* PET_DOWN */, timestamp: pointerClock++ })
    PointerEventsResult.addValue(entity as any, { ...base, state: 0 /* PET_UP */, timestamp: pointerClock++ })
  }

  function read(): UiNode[] {
    const byEntity = new Map<number, UiNode>()
    for (const [entity, transform] of engine.getEntitiesWith(UiTransform)) {
      const e = entity as unknown as number
      byEntity.set(e, {
        entity: e,
        parent: (transform as any).parent ?? ROOT_ENTITY,
        rightOf: (transform as any).rightOf ?? 0,
        transform,
        text: UiText.getOrNull(entity),
        background: UiBackground.getOrNull(entity),
        input: UiInput.getOrNull(entity),
        dropdown: UiDropdown.getOrNull(entity),
        interactive: !!PointerEvents.getOrNull(entity),
        children: []
      })
    }

    const childrenOf = new Map<number, UiNode[]>()
    for (const node of byEntity.values()) {
      const list = childrenOf.get(node.parent) ?? []
      list.push(node)
      childrenOf.set(node.parent, list)
    }

    // Order siblings via the `rightOf` linked list: the first child has rightOf 0,
    // each subsequent points at the sibling to its left.
    function order(siblings: UiNode[]): UiNode[] {
      if (siblings.length <= 1) return siblings
      const present = new Set(siblings.map((s) => s.entity))
      const byLeft = new Map<number, UiNode>()
      for (const s of siblings) byLeft.set(s.rightOf, s)
      const ordered: UiNode[] = []
      let head = siblings.find((s) => s.rightOf === 0 || !present.has(s.rightOf))
      const seen = new Set<number>()
      while (head && !seen.has(head.entity)) {
        ordered.push(head)
        seen.add(head.entity)
        head = byLeft.get(head.entity)
      }
      for (const s of siblings) if (!seen.has(s.entity)) ordered.push(s)
      return ordered
    }

    for (const node of byEntity.values()) node.children = order(childrenOf.get(node.entity) ?? [])
    return order(childrenOf.get(ROOT_ENTITY) ?? [])
  }

  return { read, click }
}

// Drive the global engine the scene's ReactEcsRenderer already targets. Seed
// UiCanvasInformation so the scene's responsive/scale logic has real canvas dims.
export function setupSceneRenderer(canvas: { width: number; height: number; devicePixelRatio?: number }): PreviewRenderer {
  const engine = globalEngine as unknown as IEngine
  const UiCanvasInformation = components.UiCanvasInformation(engine)

  function setCanvas(width: number, height: number, devicePixelRatio = 1): void {
    UiCanvasInformation.createOrReplace(engine.RootEntity, {
      width,
      height,
      devicePixelRatio,
      interactableArea: { top: 0, left: 0, right: width, bottom: height }
    })
  }
  setCanvas(canvas.width, canvas.height, canvas.devicePixelRatio ?? 1)

  const { read, click } = makeReaderAndClicker(engine)
  return { tick: (dt) => engine.update(dt), read, click, setCanvas }
}
