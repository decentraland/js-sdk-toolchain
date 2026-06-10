// Drives the @dcl/react-ecs reconciler against an Engine and reads the resulting
// UI component tree back out as plain data — exactly the data the real client
// (Godot/Unity/Bevy) would receive, minus the rendering.
//
// Two modes:
//   setupRenderer(ui)      — demo mode: a fresh standalone Engine we own.
//   setupSceneRenderer()   — scene mode: the *global* engine that @dcl/sdk's
//                            ReactEcsRenderer targets, so a real scene's
//                            setUiRenderer() + engine systems all land here.
import {
  Engine,
  engine as globalEngine,
  createInputSystem,
  createPointerEventsSystem,
  components,
  type IEngine,
  type PointerEventsSystem
} from '@dcl/ecs'
import { createReactBasedUiSystem, type UiComponent } from '@dcl/react-ecs'

export interface UiNode {
  entity: number
  parent: number
  rightOf: number
  // Read-only component values (or null when absent on this entity).
  transform: any
  text: any
  background: any
  input: any
  dropdown: any
  /** True when the entity has registered pointer handlers (onMouseDown/Up/etc.). */
  interactive: boolean
  children: UiNode[]
}

export interface PreviewRenderer {
  /** Advance the engine one frame: re-runs React, flushes component writes. */
  tick(dt: number): Promise<void>
  /** Read the current UI tree rooted at the canvas (engine root entity, id 0). */
  read(): UiNode[]
  /** Simulate a pointer click on an entity, firing its onMouseDown/Up/onClick. */
  click(entity: number): void
  /** Update the canvas dimensions (scene mode) so responsive scale recomputes. */
  setCanvas?(width: number, height: number, devicePixelRatio?: number): void
}

const ROOT_ENTITY = 0

// Builds the read() + click() halves of the renderer against any engine. The
// component definitions are idempotent per id, so calling them on an engine that
// already has the UI components (e.g. the sdk global engine) returns the existing
// defs rather than redefining them.
function makeReaderAndClicker(engine: IEngine): Pick<PreviewRenderer, 'read' | 'click'> {
  const UiTransform = components.UiTransform(engine)
  const UiText = components.UiText(engine)
  const UiBackground = components.UiBackground(engine)
  const UiInput = components.UiInput(engine)
  const UiDropdown = components.UiDropdown(engine)
  const PointerEvents = components.PointerEvents(engine)
  const PointerEventsResult = components.PointerEventsResult(engine)

  // Monotonic clock for synthesized pointer events — the input system only fires
  // handlers for commands whose timestamp is newer than the previous frame's max.
  let pointerClock = 1

  // Emit a DOWN+UP pair on the entity. On the next tick the input + pointer-event
  // systems pick these up and invoke onMouseDown / onMouseUp / onClick — the exact
  // same path the real client drives.
  function click(entity: number): void {
    const base = {
      button: 0 /* InputAction.IA_POINTER */,
      hit: undefined,
      analog: undefined,
      tickNumber: 0
    }
    PointerEventsResult.addValue(entity as any, {
      ...base,
      state: 1 /* PointerEventType.PET_DOWN */,
      timestamp: pointerClock++
    })
    PointerEventsResult.addValue(entity as any, {
      ...base,
      state: 0 /* PointerEventType.PET_UP */,
      timestamp: pointerClock++
    })
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

    // Group children by parent.
    const childrenOf = new Map<number, UiNode[]>()
    for (const node of byEntity.values()) {
      const list = childrenOf.get(node.parent) ?? []
      list.push(node)
      childrenOf.set(node.parent, list)
    }

    // Order siblings using the `rightOf` linked list: the first child has rightOf = 0,
    // and every other child points at the sibling immediately to its left.
    function order(siblings: UiNode[]): UiNode[] {
      if (siblings.length <= 1) return siblings
      const present = new Set(siblings.map((s) => s.entity))
      const byLeft = new Map<number, UiNode>() // rightOf -> node
      for (const s of siblings) byLeft.set(s.rightOf, s)

      const ordered: UiNode[] = []
      // Head = the node whose rightOf is 0 or points outside this sibling set.
      let head = siblings.find((s) => s.rightOf === 0 || !present.has(s.rightOf))
      const seen = new Set<number>()
      while (head && !seen.has(head.entity)) {
        ordered.push(head)
        seen.add(head.entity)
        head = byLeft.get(head.entity)
      }
      // Fallback: append anything the chain missed (defensive against cycles/gaps).
      for (const s of siblings) if (!seen.has(s.entity)) ordered.push(s)
      return ordered
    }

    for (const node of byEntity.values()) {
      node.children = order(childrenOf.get(node.entity) ?? [])
    }

    return order(childrenOf.get(ROOT_ENTITY) ?? [])
  }

  return { read, click }
}

// Demo mode: render a UI component against a fresh engine we fully own.
export function setupRenderer(ui: UiComponent): PreviewRenderer {
  const engine = Engine() as unknown as IEngine
  const input = createInputSystem(engine)
  const pointer = createPointerEventsSystem(engine, input) as unknown as PointerEventsSystem
  const uiSystem = createReactBasedUiSystem(engine, pointer)
  uiSystem.setUiRenderer(ui)

  const { read, click } = makeReaderAndClicker(engine)
  return {
    tick: (dt) => engine.update(dt),
    read,
    click
  }
}

// Scene mode: drive the global engine that the sdk's ReactEcsRenderer targets.
// The scene's own setUiRenderer(...) call (run before this) registers the UI;
// here we just tick that engine and read it. We seed UiCanvasInformation so the
// scene's responsive/scale logic has real canvas dimensions to work from.
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
  return {
    tick: (dt) => engine.update(dt),
    read,
    click,
    setCanvas
  }
}
