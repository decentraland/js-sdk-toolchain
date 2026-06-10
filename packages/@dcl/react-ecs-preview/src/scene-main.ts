// Scene-mode entry. The scene's entry (ui-preview.tsx or main()) has already run
// against the global engine; this builds the sidebar from the scenario map +
// discovered *.stories files, applies the active selection, then ticks the engine
// and renders its UI tree each frame.
//
// Selection semantics:
//  - Scene panels (scenarios) mutate game state → switching reloads the page so
//    each panel starts from clean state.
//  - Stories render an isolated component via ReactEcsRenderer.setUiRenderer →
//    switching swaps live, no reload.
import { ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import ReactEcs from '@dcl/sdk/react-ecs'
import { renderTree } from './dom'
import { setupSceneRenderer } from './renderer'

type Scenarios = Record<string, () => void>
type StoryModule = { file: string; mod: Record<string, unknown> }
type Story = { group: string; name: string; fn: () => unknown }

const FRAME_MS = 1000 / 30

const win = window as unknown as {
  __showError?: (m: string) => void
  __clearError?: () => void
}

export function startScenePreview(scenarios?: Scenarios, storyModules?: StoryModule[]): void {
  const root = document.getElementById('preview-root')
  if (!root) throw new Error('#preview-root not found')

  const panelNames = scenarios ? Object.keys(scenarios) : []
  const stories = collectStories(storyModules ?? [])
  const selection = activeSelection(panelNames, stories)

  if (selection.kind === 'panel' && scenarios?.[selection.id]) {
    try {
      scenarios[selection.id]()
    } catch (err) {
      win.__showError?.((err as Error)?.stack ?? String(err))
    }
  } else if (selection.kind === 'story') {
    const story = stories.find((s) => storyId(s) === selection.id)
    if (story) renderStory(story)
  }

  buildSidebar(panelNames, stories, selection.id)

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

// ── Stories (CSF-lite) ────────────────────────────────────────────────────────

function collectStories(modules: StoryModule[]): Story[] {
  const stories: Story[] = []
  for (const { file, mod } of modules) {
    const meta = (mod.default ?? {}) as { title?: string }
    const group = meta.title || file.replace(/\.stories\.\w+$/, '')
    for (const [name, value] of Object.entries(mod)) {
      if (name === 'default' || typeof value !== 'function') continue
      stories.push({ group, name, fn: value as () => unknown })
    }
  }
  return stories
}

const storyId = (s: Story) => `${s.group}/${s.name}`

// Swap the main UI renderer for the story, centered on the canvas. Uses the same
// ReactEcsRenderer instance the scene targets, so the reconciler machinery (and
// pointer events) work identically.
function renderStory(story: Story): void {
  ReactEcsRenderer.setUiRenderer(() =>
    ReactEcs.createElement(
      UiEntity as never,
      {
        uiTransform: {
          width: '100%',
          height: '100%',
          positionType: 'absolute',
          justifyContent: 'center',
          alignItems: 'center'
        }
      } as never,
      ReactEcs.createElement(story.fn as never, null) as never
    )
  )
}

// ── Selection routing (hash) ──────────────────────────────────────────────────

type Selection = { kind: 'boot' | 'panel' | 'story'; id: string }

function activeSelection(panelNames: string[], stories: Story[]): Selection {
  const hash = decodeURIComponent(location.hash.slice(1))
  const panel = (hash.match(/(?:^|&)scenario=([^&]+)/) || [])[1]
  if (panel && panelNames.includes(panel)) return { kind: 'panel', id: panel }
  const story = (hash.match(/(?:^|&)story=([^&]+)/) || [])[1]
  if (story && stories.some((s) => storyId(s) === story)) return { kind: 'story', id: story }
  if (panelNames.length) return { kind: 'panel', id: panelNames[0] }
  return { kind: 'boot', id: '' }
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function buildSidebar(panelNames: string[], stories: Story[], activeId: string): void {
  const sidebar = document.getElementById('sidebar')
  if (!sidebar) return
  if (!panelNames.length && !stories.length) {
    sidebar.style.display = 'none'
    return
  }

  const addGroup = (title: string) => {
    const h = document.createElement('div')
    h.className = 'group'
    h.textContent = title
    sidebar.appendChild(h)
  }
  const addItem = (label: string, id: string, onClick: (self: HTMLElement) => void) => {
    const b = document.createElement('button')
    b.className = 'item' + (id === activeId ? ' active' : '')
    b.textContent = label
    b.addEventListener('click', () => onClick(b))
    sidebar.appendChild(b)
  }

  if (panelNames.length) {
    addGroup('Scene')
    for (const name of panelNames) {
      // Panels mutate state → reload for a clean slate.
      addItem(name, name, () => {
        location.hash = 'scenario=' + encodeURIComponent(name)
        location.reload()
      })
    }
  }

  let lastGroup = ''
  for (const story of stories) {
    if (story.group !== lastGroup) {
      addGroup(story.group)
      lastGroup = story.group
    }
    addItem(story.name, storyId(story), (self) => {
      // Stories are isolated renders → swap live, no reload.
      location.hash = 'story=' + encodeURIComponent(storyId(story))
      renderStory(story)
      for (const el of sidebar.querySelectorAll('.item.active')) el.classList.remove('active')
      self.classList.add('active')
    })
  }
}
