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
