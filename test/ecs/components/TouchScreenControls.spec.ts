import { Engine, Entity, components, InputAction } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

const ROOT_ENTITY = 0 as Entity

describe('TouchScreenControls convenience helpers', () => {
  it('hideAll() hides every gamepad button', () => {
    const engine = Engine()
    const TouchScreenControls = components.TouchScreenControls(engine)

    TouchScreenControls.hideAll()

    const value = TouchScreenControls.getOrNull(ROOT_ENTITY)
    expect(value?.touchInputs.length).toBe(8)
    expect(value?.touchInputs.every((t) => t.hide)).toBe(true)
  })

  it('showAll() clears the button hide list but leaves joystick/crosshair untouched', () => {
    const engine = Engine()
    const TouchScreenControls = components.TouchScreenControls(engine)

    TouchScreenControls.hideJoystick()
    TouchScreenControls.hideCrosshair()
    TouchScreenControls.hideAll()
    TouchScreenControls.showAll()

    const value = TouchScreenControls.getOrNull(ROOT_ENTITY)
    expect(value?.touchInputs).toEqual([])
    // showAll only affects buttons — joystick/crosshair stay hidden
    expect(value?.hideJoystick).toBe(true)
    expect(value?.hideCrosshair).toBe(true)
  })

  it('showDefault() hides secondary and actions 3-6 and leaves the rest visible', () => {
    const engine = Engine()
    const TouchScreenControls = components.TouchScreenControls(engine)

    TouchScreenControls.showDefault()

    const value = TouchScreenControls.getOrNull(ROOT_ENTITY)
    expect(value?.touchInputs).toEqual([
      { inputAction: InputAction.IA_SECONDARY, hide: true },
      { inputAction: InputAction.IA_ACTION_3, hide: true },
      { inputAction: InputAction.IA_ACTION_4, hide: true },
      { inputAction: InputAction.IA_ACTION_5, hide: true },
      { inputAction: InputAction.IA_ACTION_6, hide: true }
    ])
  })

  it('showDefault() restores the default set after hideAll() and after showAll()', () => {
    const engine = Engine()
    const TouchScreenControls = components.TouchScreenControls(engine)
    const hidden = () =>
      (TouchScreenControls.getOrNull(ROOT_ENTITY)?.touchInputs ?? [])
        .filter((t) => t.hide)
        .map((t) => t.inputAction)
        .sort()
    const defaultHidden = [
      InputAction.IA_SECONDARY,
      InputAction.IA_ACTION_3,
      InputAction.IA_ACTION_4,
      InputAction.IA_ACTION_5,
      InputAction.IA_ACTION_6
    ].sort()

    TouchScreenControls.hideAll()
    TouchScreenControls.showDefault()
    expect(hidden()).toEqual(defaultHidden)

    TouchScreenControls.showAll()
    TouchScreenControls.showDefault()
    expect(hidden()).toEqual(defaultHidden)
  })

  it('showDefault() preserves icons, the main action and the joystick/crosshair state', () => {
    const engine = Engine()
    const TouchScreenControls = components.TouchScreenControls(engine)

    const icon = { tex: { $case: 'texture' as const, texture: { src: 'custom-action' } } }
    TouchScreenControls.createOrReplace(ROOT_ENTITY, {
      touchInputs: [
        { inputAction: InputAction.IA_JUMP, hide: true, icon },
        { inputAction: InputAction.IA_ACTION_3, hide: false, icon }
      ],
      mainAction: InputAction.IA_PRIMARY,
      hideJoystick: true,
      hideCrosshair: true
    })

    TouchScreenControls.showDefault()

    const value = TouchScreenControls.getOrNull(ROOT_ENTITY)
    const entry = (action: InputAction) => value?.touchInputs.find((t) => t.inputAction === action)
    expect(entry(InputAction.IA_JUMP)).toEqual({ inputAction: InputAction.IA_JUMP, hide: false, icon })
    expect(entry(InputAction.IA_ACTION_3)).toEqual({ inputAction: InputAction.IA_ACTION_3, hide: true, icon })
    expect(value?.mainAction).toBe(InputAction.IA_PRIMARY)
    expect(value?.hideJoystick).toBe(true)
    expect(value?.hideCrosshair).toBe(true)
  })

  describe('applyDefaultIfUnset()', () => {
    const defaultHidden = [
      InputAction.IA_SECONDARY,
      InputAction.IA_ACTION_3,
      InputAction.IA_ACTION_4,
      InputAction.IA_ACTION_5,
      InputAction.IA_ACTION_6
    ]

    function setup() {
      const engine = Engine()
      const TouchScreenControls = components.TouchScreenControls(engine)
      const hidden = () =>
        (TouchScreenControls.getOrNull(ROOT_ENTITY)?.touchInputs ?? []).filter((t) => t.hide).map((t) => t.inputAction)
      return { engine, TouchScreenControls, hidden }
    }

    it('should apply the default set when the component is absent', () => {
      const { TouchScreenControls, hidden } = setup()

      TouchScreenControls.applyDefaultIfUnset()

      expect(hidden()).toEqual(defaultHidden)
    })

    it('should apply the default set and keep the other fields when no button was chosen', () => {
      const { TouchScreenControls, hidden } = setup()
      TouchScreenControls.hideJoystick()
      TouchScreenControls.setMainAction(InputAction.IA_PRIMARY)

      TouchScreenControls.applyDefaultIfUnset()

      expect(hidden()).toEqual(defaultHidden)
      expect(TouchScreenControls.getOrNull(ROOT_ENTITY)?.hideJoystick).toBe(true)
      expect(TouchScreenControls.getOrNull(ROOT_ENTITY)?.mainAction).toBe(InputAction.IA_PRIMARY)
    })

    it('should keep the value after showAll(), even though it lists no button', () => {
      const { TouchScreenControls, hidden } = setup()
      TouchScreenControls.showAll()

      TouchScreenControls.applyDefaultIfUnset()

      expect(hidden()).toEqual([])
    })

    it('should keep the value after hide()', () => {
      const { TouchScreenControls, hidden } = setup()
      TouchScreenControls.hide([InputAction.IA_JUMP])

      TouchScreenControls.applyDefaultIfUnset()

      expect(hidden()).toEqual([InputAction.IA_JUMP])
    })

    it('should keep a value that lists a button', () => {
      const { TouchScreenControls, hidden } = setup()
      TouchScreenControls.createOrReplace(ROOT_ENTITY, {
        touchInputs: [{ inputAction: InputAction.IA_POINTER, hide: true }],
        hideJoystick: false,
        hideCrosshair: false
      })

      TouchScreenControls.applyDefaultIfUnset()

      expect(hidden()).toEqual([InputAction.IA_POINTER])
    })

    it('should see a helper call made through another wrapper of the same engine', () => {
      const { engine, TouchScreenControls, hidden } = setup()
      components.TouchScreenControls(engine).showAll()

      TouchScreenControls.applyDefaultIfUnset()

      expect(hidden()).toEqual([])
    })
  })

  it('hide() merges the given actions into the current config', () => {
    const engine = Engine()
    const TouchScreenControls = components.TouchScreenControls(engine)

    TouchScreenControls.hide([InputAction.IA_JUMP])
    TouchScreenControls.hide([InputAction.IA_PRIMARY])

    const value = TouchScreenControls.getOrNull(ROOT_ENTITY)
    const hidden = value?.touchInputs.map((t) => t.inputAction) ?? []
    expect(hidden).toContain(InputAction.IA_JUMP)
    expect(hidden).toContain(InputAction.IA_PRIMARY)
  })

  it('hide() preserves a previously configured icon (no data loss)', () => {
    const engine = Engine()
    const TouchScreenControls = components.TouchScreenControls(engine)

    const icon = { tex: { $case: 'texture' as const, texture: { src: 'custom-jump' } } }
    TouchScreenControls.createOrReplace(ROOT_ENTITY, {
      touchInputs: [{ inputAction: InputAction.IA_JUMP, hide: false, icon }],
      hideJoystick: false,
      hideCrosshair: false
    })

    TouchScreenControls.hide([InputAction.IA_JUMP])

    const entry = TouchScreenControls.getOrNull(ROOT_ENTITY)?.touchInputs.find(
      (t) => t.inputAction === InputAction.IA_JUMP
    )
    expect(entry?.hide).toBe(true)
    expect(entry?.icon).toEqual(icon)
  })

  it('setMainAction() sets the central button action', () => {
    const engine = Engine()
    const TouchScreenControls = components.TouchScreenControls(engine)

    TouchScreenControls.setMainAction(InputAction.IA_PRIMARY)

    expect(TouchScreenControls.getOrNull(ROOT_ENTITY)?.mainAction).toBe(InputAction.IA_PRIMARY)
  })

  it('hideJoystick()/showJoystick() and hideCrosshair()/showCrosshair() toggle visibility', () => {
    const engine = Engine()
    const TouchScreenControls = components.TouchScreenControls(engine)

    TouchScreenControls.hideJoystick()
    TouchScreenControls.hideCrosshair()
    expect(TouchScreenControls.getOrNull(ROOT_ENTITY)?.hideJoystick).toBe(true)
    expect(TouchScreenControls.getOrNull(ROOT_ENTITY)?.hideCrosshair).toBe(true)

    TouchScreenControls.showJoystick()
    TouchScreenControls.showCrosshair()
    expect(TouchScreenControls.getOrNull(ROOT_ENTITY)?.hideJoystick).toBe(false)
    expect(TouchScreenControls.getOrNull(ROOT_ENTITY)?.hideCrosshair).toBe(false)
  })
})

describe('Generated TouchScreenControls ProtoBuf', () => {
  it('should serialize/deserialize TouchScreenControls', () => {
    const newEngine = Engine()
    const TouchScreenControls = components.TouchScreenControls(newEngine)

    testComponentSerialization(TouchScreenControls, {
      touchInputs: [
        { inputAction: InputAction.IA_SECONDARY, hide: true, icon: undefined },
        {
          inputAction: InputAction.IA_JUMP,
          hide: false,
          icon: {
            tex: {
              $case: 'texture',
              texture: {
                src: 'custom-jump',
                wrapMode: undefined,
                filterMode: undefined,
                offset: undefined,
                tiling: undefined
              }
            }
          }
        }
      ],
      mainAction: InputAction.IA_PRIMARY,
      hideJoystick: true,
      hideCrosshair: true
    })

    testComponentSerialization(TouchScreenControls, {
      touchInputs: [],
      mainAction: undefined,
      hideJoystick: false,
      hideCrosshair: false
    })
  })
})
