// ── EDIT ME ──────────────────────────────────────────────────────────────────
// This is a normal @dcl/react-ecs UI, exactly like one you'd write in a scene.
// Save this file and the preview hot-reloads. Swap this for your own UI later.
import { Button, Dropdown, Input, Label, ReactEcs, UiEntity } from '@dcl/react-ecs'

// Colors in DCL are Color4 floats in the 0..1 range (no @dcl/sdk/math needed here).
const color = (r: number, g: number, b: number, a = 1) => ({ r, g, b, a })

const PANEL_BG = color(0.08, 0.08, 0.11, 0.92)
const ACCENT = color(1, 0.18, 0.33, 1)
const TEXT = color(0.95, 0.95, 0.98, 1)
const MUTED = color(0.6, 0.6, 0.7, 1)

export default function Ui() {
  const [count, setCount] = ReactEcs.useState(0)
  const [seconds, setSeconds] = ReactEcs.useState(0)

  // A live clock to prove state-driven re-rendering works frame to frame.
  ReactEcs.useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <UiEntity
      uiTransform={{
        width: '100%',
        height: '100%',
        positionType: 'absolute',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <UiEntity
        uiTransform={{
          width: 420,
          flexDirection: 'column',
          padding: 20,
          borderRadius: 16
        }}
        uiBackground={{ color: PANEL_BG }}
      >
        {/* Header */}
        <UiEntity uiTransform={{ width: '100%', height: 40, alignItems: 'center' }}>
          <Label value="<b>Scene HUD</b>" fontSize={22} color={TEXT} />
        </UiEntity>

        <Label value={`uptime: ${seconds}s`} fontSize={13} color={MUTED} />

        {/* Counter row */}
        <UiEntity
          uiTransform={{ width: '100%', height: 60, marginTop: 16, alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Label value={`Clicks: ${count}`} fontSize={18} color={TEXT} />
          <Button
            value="+1"
            fontSize={16}
            uiTransform={{ width: 80, height: 40 }}
            color={TEXT}
            uiBackground={{ color: ACCENT }}
            onMouseDown={() => setCount((c) => c + 1)}
          />
        </UiEntity>

        {/* Input */}
        <UiEntity uiTransform={{ width: '100%', height: 40, marginTop: 12, borderRadius: 8 }} uiBackground={{ color: color(1, 1, 1, 0.08) }}>
          <Input placeholder="Type something..." fontSize={14} color={TEXT} onChange={() => {}} />
        </UiEntity>

        {/* Dropdown */}
        <UiEntity uiTransform={{ width: '100%', height: 40, marginTop: 12, borderRadius: 8 }} uiBackground={{ color: color(1, 1, 1, 0.08) }}>
          <Dropdown options={['Easy', 'Normal', 'Hard']} selectedIndex={1} fontSize={14} color={TEXT} onChange={() => {}} />
        </UiEntity>

        {/* Footer swatches */}
        <UiEntity uiTransform={{ width: '100%', height: 24, marginTop: 16, justifyContent: 'space-between' }}>
          <UiEntity uiTransform={{ width: 60, height: 24, borderRadius: 6 }} uiBackground={{ color: ACCENT }} />
          <UiEntity uiTransform={{ width: 60, height: 24, borderRadius: 6 }} uiBackground={{ color: color(0.2, 0.8, 0.5, 1) }} />
          <UiEntity uiTransform={{ width: 60, height: 24, borderRadius: 6 }} uiBackground={{ color: color(0.25, 0.5, 1, 1) }} />
          <UiEntity uiTransform={{ width: 60, height: 24, borderRadius: 6 }} uiBackground={{ color: color(1, 0.8, 0.2, 1) }} />
        </UiEntity>
      </UiEntity>
    </UiEntity>
  )
}
