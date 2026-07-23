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

/**
 * @public
 * TouchScreenControls with convenience helpers. All helpers write the component onto the
 * RootEntity (where the client reads it) and merge with the current value.
 */
export interface TouchScreenControlsComponentDefinitionExtended
  extends LastWriteWinElementSetComponentDefinition<PBTouchScreenControls> {
  /** Hide every on-screen gamepad button. */
  hideAll(): void
  /** Show every on-screen gamepad button (clears the hide list). */
  showAll(): void
  /** Hide the given on-screen buttons (merged into the current config). */
  hide(actions: InputAction[]): void
  /** Set which action the large central button triggers. */
  setMainAction(action: InputAction): void
  /** Hide the native virtual joystick. */
  hideJoystick(): void
  /** Hide the on-screen crosshair / reticle. */
  hideCrosshair(): void
}

export function defineTouchScreenControlsComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): TouchScreenControlsComponentDefinitionExtended {
  const theComponent = TouchScreenControls(engine)

  // A mutable copy of the current RootEntity value (or a fresh default).
  function current(): PBTouchScreenControls {
    const value = theComponent.getOrNull(ROOT_ENTITY)
    return {
      touchInputs: value?.touchInputs ? value.touchInputs.map((t) => ({ ...t })) : [],
      mainAction: value?.mainAction,
      hideJoystick: value?.hideJoystick ?? false,
      hideCrosshair: value?.hideCrosshair ?? false
    }
  }

  function setHidden(actions: InputAction[]): void {
    const value = current()
    const byAction = new Map<InputAction, PBTouchScreenControls_TouchInput>()
    for (const input of value.touchInputs) byAction.set(input.inputAction, input)
    for (const action of actions) byAction.set(action, { inputAction: action, hide: true })
    value.touchInputs = [...byAction.values()]
    theComponent.createOrReplace(ROOT_ENTITY, value)
  }

  return {
    ...theComponent,
    hideAll(): void {
      setHidden(ALL_BUTTONS)
    },
    showAll(): void {
      const value = current()
      value.touchInputs = []
      theComponent.createOrReplace(ROOT_ENTITY, value)
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
    hideCrosshair(): void {
      const value = current()
      value.hideCrosshair = true
      theComponent.createOrReplace(ROOT_ENTITY, value)
    }
  }
}
