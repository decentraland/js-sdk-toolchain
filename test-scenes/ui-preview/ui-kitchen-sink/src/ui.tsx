// Kitchen-sink UI: exercises every @dcl/react-ecs feature the preview must render.
// Organized as panels (selected via state) so each area can be validated in isolation.
import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Button, Dropdown, Input, Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'

export const state = { panel: 'layout' as 'layout' | 'text' | 'widgets' | 'textures' | 'interactive' }

const PANEL_BG = Color4.create(0.09, 0.09, 0.13, 0.95)
const CARD = Color4.create(0.16, 0.16, 0.24, 1)
const ACCENT = Color4.create(1, 0.25, 0.4, 1)
const WHITE = Color4.White()
const MUTED = Color4.create(0.65, 0.65, 0.75, 1)

// Atlas quadrant uvs (GL convention, V origin at bottom): TL red, TR green, BL blue, BR yellow.
const UV_TOP_LEFT = [0, 0.5, 0, 1, 0.5, 1, 0.5, 0.5]
const UV_TOP_RIGHT = [0.5, 0.5, 0.5, 1, 1, 1, 1, 0.5]
const UV_BOTTOM_LEFT = [0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0]
const UV_BOTTOM_RIGHT = [0.5, 0, 0.5, 0.5, 1, 0.5, 1, 0]

function Section(props: { title: string; children?: ReactEcs.JSX.ReactNode }) {
  return (
    <UiEntity uiTransform={{ width: '100%', flexDirection: 'column', margin: '0 0 14px 0' }}>
      <Label value={`<b>${props.title}</b>`} fontSize={16} color={ACCENT} uiTransform={{ height: 24 }} />
      <UiEntity uiTransform={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        {props.children}
      </UiEntity>
    </UiEntity>
  )
}

const Swatch = (props: { color: Color4; label: string; uiTransform?: any }) => (
  <UiEntity
    uiTransform={{ width: 90, height: 48, margin: '0 8px 8px 0', justifyContent: 'center', alignItems: 'center', borderRadius: 8, ...props.uiTransform }}
    uiBackground={{ color: props.color }}
  >
    <Label value={props.label} fontSize={12} color={WHITE} />
  </UiEntity>
)

// ── Panels ────────────────────────────────────────────────────────────────────

const LayoutPanel = () => (
  <UiEntity uiTransform={{ width: '100%', flexDirection: 'column' }}>
    <Section title="flexDirection row / justify space-between">
      <UiEntity uiTransform={{ width: '100%', height: 56, justifyContent: 'space-between' }} uiBackground={{ color: CARD }}>
        <Swatch color={Color4.create(0.8, 0.3, 0.3, 1)} label="A" />
        <Swatch color={Color4.create(0.3, 0.8, 0.4, 1)} label="B" />
        <Swatch color={Color4.create(0.3, 0.4, 0.9, 1)} label="C" />
      </UiEntity>
    </Section>
    <Section title="column + alignItems center / % width / minWidth">
      <UiEntity uiTransform={{ width: '100%', height: 130, flexDirection: 'column', alignItems: 'center' }} uiBackground={{ color: CARD }}>
        <Swatch color={ACCENT} label="50%" uiTransform={{ width: '50%' }} />
        <Swatch color={Color4.create(0.9, 0.7, 0.2, 1)} label="minW 200" uiTransform={{ width: 10, minWidth: 200 }} />
      </UiEntity>
    </Section>
    <Section title="positionType absolute + zIndex + opacity">
      <UiEntity uiTransform={{ width: '100%', height: 110 }} uiBackground={{ color: CARD }}>
        <Swatch color={Color4.create(0.9, 0.3, 0.3, 1)} label="z0" uiTransform={{ positionType: 'absolute', position: { top: 12, left: 20 } }} />
        <Swatch color={Color4.create(0.2, 0.7, 0.9, 0.85)} label="z1 op.85" uiTransform={{ positionType: 'absolute', position: { top: 32, left: 64 }, zIndex: 1, opacity: 0.85 }} />
      </UiEntity>
    </Section>
    <Section title="borders: width / color / per-corner radius">
      <UiEntity
        uiTransform={{ width: 240, height: 64, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: ACCENT, borderRadius: { topLeft: 24, topRight: 4, bottomLeft: 4, bottomRight: 24 } }}
        uiBackground={{ color: CARD }}
      >
        <Label value="border + radius" fontSize={14} color={WHITE} />
      </UiEntity>
    </Section>
  </UiEntity>
)

const TextPanel = () => (
  <UiEntity uiTransform={{ width: '100%', flexDirection: 'column' }}>
    <Section title="fonts & rich text">
      <Label value="sans-serif <b>bold</b> <i>italic</i>" font="sans-serif" fontSize={18} color={WHITE} uiTransform={{ height: 28, width: '100%' }} textAlign="middle-left" />
      <Label value="serif font" font="serif" fontSize={18} color={WHITE} uiTransform={{ height: 28, width: '100%' }} textAlign="middle-left" />
      <Label value="monospace font" font="monospace" fontSize={18} color={WHITE} uiTransform={{ height: 28, width: '100%' }} textAlign="middle-left" />
    </Section>
    <Section title="textAlign 3x3">
      <UiEntity uiTransform={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap' }}>
        {(['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const).map((a) => (
          <UiEntity key={a} uiTransform={{ width: '32%', height: 56, margin: '0 1% 6px 0' }} uiBackground={{ color: CARD }}>
            <Label value={a} fontSize={11} color={MUTED} textAlign={a} uiTransform={{ width: '100%', height: '100%' }} />
          </UiEntity>
        ))}
      </UiEntity>
    </Section>
    <Section title="textWrap">
      <UiEntity uiTransform={{ width: 220, height: 70 }} uiBackground={{ color: CARD }}>
        <Label value="wrapping text inside a narrow 220px container stays inside" fontSize={14} color={WHITE} textWrap="wrap" uiTransform={{ width: '100%', height: '100%' }} />
      </UiEntity>
    </Section>
  </UiEntity>
)

const WidgetsPanel = () => {
  const [text, setText] = ReactEcs.useState('')
  const [choice, setChoice] = ReactEcs.useState(1)
  return (
    <UiEntity uiTransform={{ width: '100%', flexDirection: 'column' }}>
      <Section title="Input">
        <UiEntity uiTransform={{ width: 320, height: 42, borderRadius: 8 }} uiBackground={{ color: CARD }}>
          <Input placeholder="type here..." fontSize={15} color={WHITE} placeholderColor={MUTED} onChange={(v) => setText(v)} />
        </UiEntity>
        <Label value={`value: "${text}"`} fontSize={13} color={MUTED} uiTransform={{ height: 42, margin: '0 0 0 12px' }} />
      </Section>
      <Section title="Dropdown">
        <UiEntity uiTransform={{ width: 220, height: 42, borderRadius: 8 }} uiBackground={{ color: CARD }}>
          <Dropdown options={['Easy', 'Normal', 'Hard']} selectedIndex={choice} fontSize={15} color={WHITE} onChange={(i) => setChoice(i)} />
        </UiEntity>
        <Label value={`selected: ${['Easy', 'Normal', 'Hard'][choice]}`} fontSize={13} color={MUTED} uiTransform={{ height: 42, margin: '0 0 0 12px' }} />
      </Section>
      <Section title="Button variants">
        <Button value="primary" variant="primary" fontSize={15} uiTransform={{ width: 130, height: 42, margin: '0 10px 0 0' }} onMouseDown={() => {}} />
        <Button value="secondary" variant="secondary" fontSize={15} uiTransform={{ width: 130, height: 42 }} onMouseDown={() => {}} />
      </Section>
    </UiEntity>
  )
}

const TexturesPanel = () => (
  <UiEntity uiTransform={{ width: '100%', flexDirection: 'column' }}>
    <Section title="full texture (stretch)">
      <UiEntity uiTransform={{ width: 96, height: 96, margin: '0 10px 0 0' }} uiBackground={{ texture: { src: 'images/atlas.png' }, textureMode: 'stretch' }} />
    </Section>
    <Section title="uvs atlas — each cell cut from one 128px atlas (red/green/blue/yellow)">
      <UiEntity uiTransform={{ width: 72, height: 72, margin: '0 10px 0 0' }} uiBackground={{ texture: { src: 'images/atlas.png' }, textureMode: 'stretch', uvs: UV_TOP_LEFT }} />
      <UiEntity uiTransform={{ width: 72, height: 72, margin: '0 10px 0 0' }} uiBackground={{ texture: { src: 'images/atlas.png' }, textureMode: 'stretch', uvs: UV_TOP_RIGHT }} />
      <UiEntity uiTransform={{ width: 72, height: 72, margin: '0 10px 0 0' }} uiBackground={{ texture: { src: 'images/atlas.png' }, textureMode: 'stretch', uvs: UV_BOTTOM_LEFT }} />
      <UiEntity uiTransform={{ width: 72, height: 72, margin: '0 10px 0 0' }} uiBackground={{ texture: { src: 'images/atlas.png' }, textureMode: 'stretch', uvs: UV_BOTTOM_RIGHT }} />
    </Section>
    <Section title="nine-slices — same 96px frame texture at 3 sizes (borders must not stretch)">
      <UiEntity uiTransform={{ width: 110, height: 70, margin: '0 10px 0 0' }} uiBackground={{ texture: { src: 'images/nineslice.png' }, textureMode: 'nine-slices', textureSlices: { top: 0.25, right: 0.25, bottom: 0.25, left: 0.25 } }} />
      <UiEntity uiTransform={{ width: 240, height: 90, margin: '0 10px 0 0' }} uiBackground={{ texture: { src: 'images/nineslice.png' }, textureMode: 'nine-slices', textureSlices: { top: 0.25, right: 0.25, bottom: 0.25, left: 0.25 } }} />
      <UiEntity uiTransform={{ width: 380, height: 60 }} uiBackground={{ texture: { src: 'images/nineslice.png' }, textureMode: 'nine-slices', textureSlices: { top: 0.25, right: 0.25, bottom: 0.25, left: 0.25 } }} />
    </Section>
    <Section title="center mode">
      <UiEntity uiTransform={{ width: 220, height: 90 }} uiBackground={{ color: CARD, texture: { src: 'images/atlas.png' }, textureMode: 'center' }} />
    </Section>
  </UiEntity>
)

const InteractivePanel = () => {
  const [count, setCount] = ReactEcs.useState(0)
  const [seconds, setSeconds] = ReactEcs.useState(0)
  ReactEcs.useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <UiEntity uiTransform={{ width: '100%', flexDirection: 'column' }}>
      <Section title="useState + onMouseDown">
        <Button value={`clicks: ${count} (+1)`} variant="primary" fontSize={16} uiTransform={{ width: 200, height: 48 }} onMouseDown={() => setCount((c) => c + 1)} />
      </Section>
      <Section title="useEffect timer (re-render every second)">
        <Label value={`uptime: ${seconds}s`} fontSize={18} color={WHITE} uiTransform={{ height: 30 }} />
      </Section>
    </UiEntity>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

const PANELS: Record<string, () => ReactEcs.JSX.Element> = {
  layout: LayoutPanel,
  text: TextPanel,
  widgets: WidgetsPanel,
  textures: TexturesPanel,
  interactive: InteractivePanel
}

const Root = () => {
  const Active = PANELS[state.panel] ?? LayoutPanel
  return (
    <UiEntity uiTransform={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
      <UiEntity uiTransform={{ width: 760, maxHeight: '92%', flexDirection: 'column', padding: 18, borderRadius: 14, overflow: 'scroll' }} uiBackground={{ color: PANEL_BG }}>
        <Label value={`<b>kitchen-sink / ${state.panel}</b>`} fontSize={20} color={WHITE} uiTransform={{ height: 34 }} textAlign="middle-left" />
        <Active />
      </UiEntity>
    </UiEntity>
  )
}

export function setupUi() {
  ReactEcsRenderer.setUiRenderer(Root)
}
