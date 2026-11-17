import { Entity, IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine'
import { TouchScreenControls, PBTouchScreenControls, PBTouchScreenControls_TouchInput } from '../generated/index.gen'
import { InputAction } from '../generated/pb/decentraland/sdk/components/common/input_action.gen'

const ROOT_ENTITY = 0 as Entity

// Every on-screen gamepad action button.
const ALL_BUTTONS: InputAction[] = [
  InputAction.IA_POINTER,
  InputAction.IA_PRIMARY,
  InputAction.IA_SECONDARY,
  InputAction.IA_JUMP,
  InputAction.IA_ACTION_3,
  InputAction.IA_ACTION_4,
  InputAction.IA_ACTION_5,
  InputAction.IA_ACTION_6
]

// Buttons hidden in the default set; the rest of ALL_BUTTONS stay visible.
const DEFAULT_HIDDEN_BUTTONS: InputAction[] = [
  InputAction.IA_SECONDARY,
  InputAction.IA_ACTION_3,
  InputAction.IA_ACTION_4,
  InputAction.IA_ACTION_5,
  InputAction.IA_ACTION_6
]

// Component definitions on which a button-visibility helper ran. Keyed by the definition, which is
// shared by every wrapper built for the same engine.
const visibilityExpressed = new WeakSet<object>()

/**
 * @public
 * TouchScreenControls with convenience helpers. All helpers write the component onto the
 * RootEntity (where the client reads it) and merge with the current value.
 */
export interface TouchScreenControlsComponentDefinitionExtended
  extends LastWriteWinElementSetComponentDefinition<PBTouchScreenControls> {
  /** Hide every on-screen gamepad button. */
  hideAll(): void
  /**
   * Show every on-screen gamepad button (clears the button hide list).
   * Does NOT change the joystick/crosshair — use `showJoystick()` / `showCrosshair()` for those.
   */
  showAll(): void
  /**
   * Show the default button set: jump, pointer and primary visible, secondary and
   * actions 3-6 hidden. This is the state every scene starts in.
   * Does NOT change the joystick/crosshair, the main action or custom icons.
   */
  showDefault(): void
  /**
   * @internal
   * Called by the SDK at scene start. Applies the default button set unless the scene already chose
   * its buttons: a visibility helper ran, or the value lists any button. Other fields are kept.
   */
  applyDefaultIfUnset(): void
  /** Hide the given on-screen buttons (merged into the current config). */
  hide(actions: InputAction[]): void
  /** Set which action the large central button triggers. */
  setMainAction(action: InputAction): void
  /** Hide the native virtual joystick. */
  hideJoystick(): void
  /** Show the native virtual joystick. */
  showJoystick(): void
  /** Hide the on-screen crosshair / reticle. */
  hideCrosshair(): void
  /** Show the on-screen crosshair / reticle. */
  showCrosshair(): void
}

export function defineTouchScreenControlsComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): TouchScreenControlsComponentDefinitionExtended {
  const theComponent = TouchScreenControls(engine)

  // A mutable copy of the current RootEntity value (or a fresh default).
  function current(): PBTouchScreenControls {
    const value = theComponent.getOrNull(ROOT_ENTITY)
    return {
      touchInputs: value?.touchInputs
        ? value.touchInputs.map((t) => ({ ...t, icon: t.icon ? { ...t.icon } : t.icon }))
        : [],
      mainAction: value?.mainAction,
      hideJoystick: value?.hideJoystick ?? false,
      hideCrosshair: value?.hideCrosshair ?? false
    }
  }

  function setHidden(actions: InputAction[]): void {
    visibilityExpressed.add(theComponent)
    const value = current()
    const byAction = new Map<InputAction, PBTouchScreenControls_TouchInput>()
    for (const input of value.touchInputs) byAction.set(input.inputAction, input)
    for (const action of actions) byAction.set(action, { ...byAction.get(action), inputAction: action, hide: true })
    value.touchInputs = [...byAction.values()]
    theComponent.createOrReplace(ROOT_ENTITY, value)
  }

  // Every button visible except DEFAULT_HIDDEN_BUTTONS; existing entries keep their position and icon.
  function writeDefault(): void {
    const value = current()
    const byAction = new Map<InputAction, PBTouchScreenControls_TouchInput>()
    for (const input of value.touchInputs) byAction.set(input.inputAction, { ...input, hide: false })
    for (const action of DEFAULT_HIDDEN_BUTTONS) {
      byAction.set(action, { ...byAction.get(action), inputAction: action, hide: true })
    }
    value.touchInputs = [...byAction.values()]
    theComponent.createOrReplace(ROOT_ENTITY, value)
  }

  return {
    ...theComponent,
    hideAll(): void {
      setHidden(ALL_BUTTONS)
    },
    showAll(): void {
      visibilityExpressed.add(theComponent)
      const value = current()
      value.touchInputs = []
      theComponent.createOrReplace(ROOT_ENTITY, value)
    },
    showDefault(): void {
      visibilityExpressed.add(theComponent)
      writeDefault()
    },
    applyDefaultIfUnset(): void {
      if (visibilityExpressed.has(theComponent)) return
      if (theComponent.getOrNull(ROOT_ENTITY)?.touchInputs.length) return
      writeDefault()
    },
    hide(actions: InputAction[]): void {
      setHidden(actions)
    },
    setMainAction(action: InputAction): void {
      const value = current()
      value.mainAction = action
      theComponent.createOrReplace(ROOT_ENTITY, value)
    },
    hideJoystick(): void {
      const value = current()
      value.hideJoystick = true
      theComponent.createOrReplace(ROOT_ENTITY, value)
    },
    showJoystick(): void {
      const value = current()
      value.hideJoystick = false
      theComponent.createOrReplace(ROOT_ENTITY, value)
    },
    hideCrosshair(): void {
      const value = current()
      value.hideCrosshair = true
      theComponent.createOrReplace(ROOT_ENTITY, value)
    },
    showCrosshair(): void {
      const value = current()
      value.hideCrosshair = false
      theComponent.createOrReplace(ROOT_ENTITY, value)
    }
  }
}
