// Browser entry point. Boots the standalone engine + reconciler, then runs a
// frame loop that ticks the engine and re-renders the DOM. On file save esbuild
// rebuilds and the page reloads (see public/index.html live-reload snippet).
import { renderTree } from './dom'
import { setupRenderer } from './renderer'
import ui from './demo/ui'

const root = document.getElementById('preview-root')
if (!root) throw new Error('#preview-root not found')

const renderer = setupRenderer(ui)
const FRAME_MS = 1000 / 30

async function loop(): Promise<void> {
  try {
    await renderer.tick(FRAME_MS / 1000)
    renderTree(root!, renderer.read(), renderer.click)
    ;(window as any).__clearError?.()
  } catch (err) {
    ;(window as any).__showError?.((err as Error)?.stack ?? String(err))
  }
  setTimeout(() => void loop(), FRAME_MS)
}

void loop()
