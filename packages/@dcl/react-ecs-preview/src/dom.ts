// Translates the read-out UI node tree into real DOM, mapping UiTransform → CSS
// flexbox and letting the browser's own flex engine lay it out. This is the v1
// "browser flexbox" approach: instant, dependency-free, and visually ~faithful.
// (Pixel-exact parity with the client's Yoga pass is a later upgrade — see README.)
import {
  ALIGN,
  color4ToCss,
  DISPLAY,
  FLEX_DIRECTION,
  FLEX_WRAP,
  FONT_FAMILY,
  JUSTIFY,
  OVERFLOW,
  POSITION_TYPE,
  textAlign,
  unitValue
} from './enums'
import type { UiNode } from './renderer'

type ClickHandler = (entity: number) => void

// Base URL of the scene asset server (scene mode); "" in demo mode. Relative
// texture `src` paths are resolved against it so images/audio load.
declare const __SCENE_ASSETS__: string

function resolveTexture(src: string): string {
  if (/^(https?:|data:|blob:)/.test(src)) return src
  if (typeof __SCENE_ASSETS__ === 'undefined' || !__SCENE_ASSETS__) return src
  return __SCENE_ASSETS__ + src.replace(/^\.?\//, '')
}

// Escape HTML, then re-enable only the <b> and <i> tags that DCL text supports.
function formatRichText(value: string): string {
  const escaped = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .replace(/&lt;(\/?)(b|i)&gt;/g, '<$1$2>')
}

function px(value: number, unit: number, set: (v: string) => void): void {
  const v = unitValue(value, unit)
  if (v !== undefined) set(v)
}

function applyTransform(el: HTMLElement, t: any): void {
  const s = el.style

  // Layout
  s.display = DISPLAY[t.display] ?? 'flex'
  if (s.display === 'none') return
  s.flexDirection = FLEX_DIRECTION[t.flexDirection] ?? 'row'
  s.justifyContent = JUSTIFY[t.justifyContent] ?? 'flex-start'
  // alignItems is only present when set; Yoga's default is stretch (matches CSS).
  if (t.alignItems !== undefined) s.alignItems = ALIGN[t.alignItems] ?? 'stretch'
  s.alignSelf = ALIGN[t.alignSelf] ?? 'auto'
  if (t.alignContent !== undefined) s.alignContent = ALIGN[t.alignContent]
  if (t.flexWrap !== undefined) s.flexWrap = FLEX_WRAP[t.flexWrap] ?? 'nowrap'
  s.position = POSITION_TYPE[t.positionType] ?? 'relative'
  s.overflow = OVERFLOW[t.overflow] ?? 'visible'

  // Sizing
  px(t.width, t.widthUnit, (v) => (s.width = v))
  px(t.height, t.heightUnit, (v) => (s.height = v))
  px(t.minWidth, t.minWidthUnit, (v) => (s.minWidth = v))
  px(t.maxWidth, t.maxWidthUnit, (v) => (s.maxWidth = v))
  px(t.minHeight, t.minHeightUnit, (v) => (s.minHeight = v))
  px(t.maxHeight, t.maxHeightUnit, (v) => (s.maxHeight = v))

  // Flex
  if (t.flexGrow) s.flexGrow = String(t.flexGrow)
  if (t.flexShrink !== undefined) s.flexShrink = String(t.flexShrink)
  px(t.flexBasis, t.flexBasisUnit, (v) => (s.flexBasis = v))

  // Position offsets (used for both relative nudges and absolute placement)
  px(t.positionLeft, t.positionLeftUnit, (v) => (s.left = v))
  px(t.positionTop, t.positionTopUnit, (v) => (s.top = v))
  px(t.positionRight, t.positionRightUnit, (v) => (s.right = v))
  px(t.positionBottom, t.positionBottomUnit, (v) => (s.bottom = v))

  // Margin
  px(t.marginLeft, t.marginLeftUnit, (v) => (s.marginLeft = v))
  px(t.marginTop, t.marginTopUnit, (v) => (s.marginTop = v))
  px(t.marginRight, t.marginRightUnit, (v) => (s.marginRight = v))
  px(t.marginBottom, t.marginBottomUnit, (v) => (s.marginBottom = v))

  // Padding
  px(t.paddingLeft, t.paddingLeftUnit, (v) => (s.paddingLeft = v))
  px(t.paddingTop, t.paddingTopUnit, (v) => (s.paddingTop = v))
  px(t.paddingRight, t.paddingRightUnit, (v) => (s.paddingRight = v))
  px(t.paddingBottom, t.paddingBottomUnit, (v) => (s.paddingBottom = v))

  // Borders
  let hasBorder = false
  px(t.borderLeftWidth, t.borderLeftWidthUnit, (v) => ((s.borderLeftWidth = v), (hasBorder = true)))
  px(t.borderTopWidth, t.borderTopWidthUnit, (v) => ((s.borderTopWidth = v), (hasBorder = true)))
  px(t.borderRightWidth, t.borderRightWidthUnit, (v) => ((s.borderRightWidth = v), (hasBorder = true)))
  px(t.borderBottomWidth, t.borderBottomWidthUnit, (v) => ((s.borderBottomWidth = v), (hasBorder = true)))
  if (hasBorder) s.borderStyle = 'solid'
  const bl = color4ToCss(t.borderLeftColor)
  const bt = color4ToCss(t.borderTopColor)
  const br = color4ToCss(t.borderRightColor)
  const bb = color4ToCss(t.borderBottomColor)
  if (bl) s.borderLeftColor = bl
  if (bt) s.borderTopColor = bt
  if (br) s.borderRightColor = br
  if (bb) s.borderBottomColor = bb
  px(t.borderTopLeftRadius, t.borderTopLeftRadiusUnit, (v) => (s.borderTopLeftRadius = v))
  px(t.borderTopRightRadius, t.borderTopRightRadiusUnit, (v) => (s.borderTopRightRadius = v))
  px(t.borderBottomLeftRadius, t.borderBottomLeftRadiusUnit, (v) => (s.borderBottomLeftRadius = v))
  px(t.borderBottomRightRadius, t.borderBottomRightRadiusUnit, (v) => (s.borderBottomRightRadius = v))

  // Misc
  if (t.opacity !== undefined && t.opacity !== 1) s.opacity = String(t.opacity)
  if (t.zIndex) s.zIndex = String(t.zIndex)
}

// uvs is 8 floats (4 corners, GL convention: V origin at bottom). Reduce to the
// normalized sub-rect [u0,u1]×[v0,v1] via min/max — robust to corner ordering.
// CSS sprite math: size = 100/du %, position = offset/(1-d) * 100 %.
function applyUvsAtlas(el: HTMLElement, uvs: number[]): boolean {
  const us = [uvs[0], uvs[2], uvs[4], uvs[6]]
  const vs = [uvs[1], uvs[3], uvs[5], uvs[7]]
  const u0 = Math.min(...us)
  const u1 = Math.max(...us)
  const v0 = Math.min(...vs)
  const v1 = Math.max(...vs)
  const du = u1 - u0
  const dv = v1 - v0
  if (!(du > 0) || !(dv > 0)) return false
  el.style.backgroundSize = `${100 / du}% ${100 / dv}%`
  const posX = du >= 1 ? 0 : (u0 / (1 - du)) * 100
  const topFromTop = 1 - v1 // CSS Y origin is top; uvs' V origin is bottom
  const posY = dv >= 1 ? 0 : (topFromTop / (1 - dv)) * 100
  el.style.backgroundPosition = `${posX}% ${posY}%`
  return true
}

// Nine-slice via CSS border-image. Slice fractions are relative to the texture,
// so we need its natural size — measured async; styles apply on image load.
function applyNineSlice(el: HTMLElement, src: string, slices: any): void {
  const t = slices?.top ?? 1 / 3
  const r = slices?.right ?? 1 / 3
  const b = slices?.bottom ?? 1 / 3
  const l = slices?.left ?? 1 / 3
  const img = new Image()
  img.onload = () => {
    const st = t * img.naturalHeight
    const sr = r * img.naturalWidth
    const sb = b * img.naturalHeight
    const sl = l * img.naturalWidth
    el.style.backgroundImage = 'none'
    el.style.borderStyle = 'solid'
    el.style.borderColor = 'transparent'
    el.style.borderWidth = `${st}px ${sr}px ${sb}px ${sl}px`
    el.style.borderImage = `url("${src}") ${st} ${sr} ${sb} ${sl} fill stretch`
  }
  img.src = src
}

function applyBackground(el: HTMLElement, bg: any): void {
  const color = color4ToCss(bg.color)
  if (color) el.style.backgroundColor = color

  const rawSrc: string | undefined = bg.texture?.tex?.texture?.src ?? bg.texture?.texture?.src ?? bg.texture?.src
  if (rawSrc) {
    const src = resolveTexture(rawSrc)
    el.style.backgroundImage = `url("${src}")`
    el.style.backgroundRepeat = 'no-repeat'
    // BackgroundTextureMode: 0 nine-slices (the engine default), 1 center, 2 stretch
    if (bg.textureMode === 1) {
      el.style.backgroundPosition = 'center'
      el.style.backgroundSize = 'auto'
    } else if (bg.textureMode === 0) {
      applyNineSlice(el, src, bg.textureSlices)
    } else {
      // stretch — honor the uvs atlas sub-rect when provided
      if (!(Array.isArray(bg.uvs) && bg.uvs.length >= 8 && applyUvsAtlas(el, bg.uvs))) {
        el.style.backgroundSize = '100% 100%'
      }
    }
  }
}

function applyText(host: HTMLElement, text: any): HTMLElement {
  const wrap = document.createElement('div')
  wrap.style.display = 'flex'
  wrap.style.flex = '1'
  wrap.style.width = '100%'
  wrap.style.height = '100%'

  const span = document.createElement('span')
  // value supports <b>/<i> in-world. Escape everything, then re-allow only b/i.
  span.innerHTML = formatRichText(String(text.value ?? ''))

  const c = color4ToCss(text.color)
  span.style.color = c ?? '#ffffff'
  if (text.fontSize) span.style.fontSize = `${text.fontSize}px`
  if (text.font !== undefined) span.style.fontFamily = FONT_FAMILY[text.font] ?? FONT_FAMILY[0]
  span.style.whiteSpace = text.textWrap === 1 /* WRAP */ ? 'normal' : 'nowrap'

  // TextAlignMode → box alignment + text-align (default middle-center, TAM=4).
  const ta = textAlign(text.textAlign ?? 4)
  wrap.style.justifyContent = ta.justify
  wrap.style.alignItems = ta.align
  span.style.textAlign = ta.textAlign

  wrap.appendChild(span)
  host.appendChild(wrap)
  return host
}

function applyInput(host: HTMLElement, input: any): void {
  const el = document.createElement('input')
  el.placeholder = input.placeholder ?? ''
  if (input.value !== undefined) el.value = input.value
  el.disabled = !!input.disabled
  el.style.width = '100%'
  el.style.height = '100%'
  el.style.boxSizing = 'border-box'
  el.style.background = 'transparent'
  el.style.border = 'none'
  el.style.outline = 'none'
  el.style.padding = '0 6px'
  const c = color4ToCss(input.color)
  if (c) el.style.color = c
  if (input.fontSize) el.style.fontSize = `${input.fontSize}px`
  if (input.font !== undefined) el.style.fontFamily = FONT_FAMILY[input.font] ?? FONT_FAMILY[0]
  host.appendChild(el)
}

function applyDropdown(host: HTMLElement, dropdown: any): void {
  const el = document.createElement('select')
  el.disabled = !!dropdown.disabled
  el.style.width = '100%'
  el.style.height = '100%'
  el.style.boxSizing = 'border-box'
  el.style.background = 'transparent'
  el.style.border = 'none'
  const c = color4ToCss(dropdown.color)
  if (c) el.style.color = c
  if (dropdown.fontSize) el.style.fontSize = `${dropdown.fontSize}px`

  if (dropdown.acceptEmpty) {
    const opt = document.createElement('option')
    opt.textContent = dropdown.emptyLabel ?? ''
    el.appendChild(opt)
  }
  for (const label of dropdown.options ?? []) {
    const opt = document.createElement('option')
    opt.textContent = label
    el.appendChild(opt)
  }
  if (dropdown.selectedIndex !== undefined && dropdown.selectedIndex >= 0) {
    el.selectedIndex = dropdown.selectedIndex + (dropdown.acceptEmpty ? 1 : 0)
  }
  host.appendChild(el)
}

function buildNode(node: UiNode, onClick: ClickHandler): HTMLElement {
  const el = document.createElement('div')
  el.dataset.entity = String(node.entity)
  el.style.boxSizing = 'border-box'

  if (node.transform) applyTransform(el, node.transform)
  if (node.background) applyBackground(el, node.background)
  if (node.text) applyText(el, node.text)
  if (node.input) applyInput(el, node.input)
  if (node.dropdown) applyDropdown(el, node.dropdown)

  if (node.interactive) {
    el.style.cursor = 'pointer'
    el.addEventListener('click', (ev) => {
      ev.stopPropagation()
      onClick(node.entity)
    })
  }

  for (const child of node.children) {
    el.appendChild(buildNode(child, onClick))
  }
  return el
}

let lastSignature = ''

// Cheap change detection: only rebuild the DOM when the read-out tree actually
// changed. Avoids stomping <input> focus / selection on every animation frame.
function signature(nodes: UiNode[]): string {
  return JSON.stringify(nodes)
}

export function renderTree(root: HTMLElement, nodes: UiNode[], onClick: ClickHandler): void {
  const sig = signature(nodes)
  if (sig === lastSignature) return
  lastSignature = sig

  root.replaceChildren()
  for (const node of nodes) {
    root.appendChild(buildNode(node, onClick))
  }
}
