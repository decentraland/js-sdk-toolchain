// Scene-mode entry. The scene's debug file (imported before this by the bundler)
// has already called setUiRenderer(...) on the global engine and may default-export
// a map of named scenarios. Here we build a panel switcher from those, apply the
// active one, then tick the global engine and render its UI tree each frame.
import { renderTree } from './dom'
import { setupSceneRenderer } from './renderer'

type Scenarios = Record<string, () => void>

const FRAME_MS = 1000 / 30

const win = window as unknown as {
  __showError?: (m: string) => void
  __clearError?: () => void
}

export function startScenePreview(scenarios?: Scenarios): void {
  const root = document.getElementById('preview-root')
  if (!root) throw new Error('#preview-root not found')

  const names = scenarios ? Object.keys(scenarios) : []
  const active = activeScenario(names)

  if (scenarios && active && scenarios[active]) {
    try {
      scenarios[active]()
    } catch (err) {
      win.__showError?.((err as Error)?.stack ?? String(err))
    }
  }
  if (names.length) buildSwitcher(names, active)

  const dpr = () => parseFloat(root.dataset.dpr || '1') || 1
  const renderer = setupSceneRenderer({
    width: root.clientWidth || 1280,
    height: root.clientHeight || 720,
    devicePixelRatio: dpr()
  })
  let lastW = root.clientWidth
  let lastH = root.clientHeight
  let lastDpr = dpr()

  async function loop(): Promise<void> {
    try {
      // dpr must be part of the change check: presets like 1920×1080 and 1280×720
      // normalize to the SAME 1280×720 canvas and differ only in devicePixelRatio.
      if (root!.clientWidth !== lastW || root!.clientHeight !== lastH || dpr() !== lastDpr) {
        lastW = root!.clientWidth
        lastH = root!.clientHeight
        lastDpr = dpr()
        renderer.setCanvas?.(lastW || 1280, lastH || 720, lastDpr)
      }
      await renderer.tick(FRAME_MS / 1000)
      renderTree(root!, renderer.read(), renderer.click)
      win.__clearError?.()
    } catch (err) {
      win.__showError?.((err as Error)?.stack ?? String(err))
    }
    setTimeout(() => void loop(), FRAME_MS)
  }

  void loop()
}

function activeScenario(names: string[]): string {
  const fromHash = decodeURIComponent((location.hash.match(/scenario=([^&]+)/) || [])[1] || '')
  return names.includes(fromHash) ? fromHash : names[0] || ''
}

// Selecting a panel reloads with the new scenario in the hash, so each scenario
// starts from clean UI state rather than stacking on top of the previous one.
function buildSwitcher(names: string[], active: string): void {
  const header = document.querySelector('header')
  if (!header) return

  const label = document.createElement('label')
  label.textContent = 'panel'

  const select = document.createElement('select')
  for (const name of names) {
    const opt = document.createElement('option')
    opt.value = name
    opt.textContent = name
    if (name === active) opt.selected = true
    select.appendChild(opt)
  }
  select.addEventListener('change', () => {
    location.hash = 'scenario=' + encodeURIComponent(select.value)
    location.reload()
  })

  const anchor = header.querySelector('label') // the "canvas" size label
  header.insertBefore(label, anchor)
  header.insertBefore(select, anchor)
}
