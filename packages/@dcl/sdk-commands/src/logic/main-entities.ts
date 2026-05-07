/**
 * main-entities.ts — name-keyed authoring file for editable scene entities.
 *
 * The author writes a typed `scene` constant in `main-entities.ts` at the
 * scene root. At build time we extract that object literal, populate the
 * Engine, and dump CRDT bytes to `main.crdt`. The editor's POST handler
 * mutates the literal in place via the same parse/splice path.
 *
 *   // main-entities.ts
 *   import type { Scene } from '@dcl/sdk/scene-types'
 *
 *   export const scene: Scene = {
 *     barrel_1: {
 *       components: {
 *         Transform: { position: { x: 5, y: 0, z: 8 } },
 *         GltfContainer: { src: 'models/Barrel.glb' }
 *       }
 *     }
 *   }
 *
 * Constraints on the `scene` literal: only object/array literals,
 * primitives. No imports, no function calls, no spreads — the parse step
 * is `JSON.parse(slice)`.
 */

import path from 'path'
import * as ts from 'typescript'
import { Engine, Entity, IEngine } from '@dcl/ecs/dist-cjs'
import * as ecsComponents from '@dcl/ecs/dist-cjs/components'

import { CliComponents } from '../components'
import { printError } from './beautiful-logs'

export type Scene = Record<string, SceneEntity>

export interface SceneEntity {
  components: Record<string, unknown>
}

const MAIN_ENTITIES_FILE = 'main-entities.ts'
const FILE_TEMPLATE = `import type { Scene } from '@dcl/sdk/scene-types'\n\nexport const scene: Scene = `

type FsComponent = Pick<CliComponents['fs'], 'readFile' | 'writeFile' | 'access'>

async function fileExists(fs: FsComponent, filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export function mainEntitiesPath(workingDirectory: string): string {
  return path.join(workingDirectory, MAIN_ENTITIES_FILE)
}

// ── Parse: find the `scene` object literal in the source ───────────────

interface ParsedSource {
  text: string
  scene: Scene
  /** Inclusive start of the object literal in `text`. */
  literalStart: number
  /** Exclusive end of the object literal in `text`. */
  literalEnd: number
}

/**
 * Parse main-entities.ts. Returns the file text, the parsed `scene`
 * object, and the byte offsets of the object literal in the source so we
 * can splice an updated version back in without disturbing imports,
 * comments, or the `export const scene: Scene =` preamble.
 */
function parseSource(text: string): ParsedSource | null {
  const sf = ts.createSourceFile(MAIN_ENTITIES_FILE, text, ts.ScriptTarget.Latest, true)

  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue
    if (!stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue

    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== 'scene') continue
      if (!decl.initializer) continue

      // Unwrap `satisfies Scene` and `as const` wrappers so we splice the
      // inner object literal, leaving the surrounding type assertion intact.
      const objectLiteral = unwrapToObjectLiteral(decl.initializer)
      if (!objectLiteral) continue

      const literalStart = objectLiteral.getStart(sf)
      const literalEnd = objectLiteral.getEnd()
      // Walk the AST instead of JSON.parse-ing the slice — that way comments,
      // trailing commas, and unquoted identifier keys (all valid TS sugar)
      // don't break us.
      const scene = literalToValue(objectLiteral) as Scene
      return { text, scene, literalStart, literalEnd }
    }
  }
  return null
}

function unwrapToObjectLiteral(node: ts.Expression): ts.ObjectLiteralExpression | null {
  let current: ts.Expression = node
  // SatisfiesExpression and AsExpression both wrap the underlying expression
  // in `.expression`. Walk through any chain of them.
  while (ts.isSatisfiesExpression(current) || ts.isAsExpression(current) || ts.isTypeAssertionExpression(current)) {
    current = current.expression
  }
  return ts.isObjectLiteralExpression(current) ? current : null
}

/**
 * Convert a TypeScript expression node to a plain JS value, restricted to
 * JSON-compatible shapes. Throws on anything outside the allowed grammar
 * (function calls, identifiers, spreads, etc.) so unsupported expressions
 * fail loudly instead of becoming silent `undefined`s.
 */
function literalToValue(node: ts.Expression): unknown {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isNumericLiteral(node)) return Number(node.text)
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (node.kind === ts.SyntaxKind.NullKeyword) return null
  if (ts.isPrefixUnaryExpression(node)) {
    const inner = literalToValue(node.operand)
    if (node.operator === ts.SyntaxKind.MinusToken && typeof inner === 'number') return -inner
    if (node.operator === ts.SyntaxKind.PlusToken && typeof inner === 'number') return inner
    throw new Error(`Unsupported prefix operator in scene literal`)
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((el) => {
      if (el.kind === ts.SyntaxKind.OmittedExpression) {
        throw new Error(`Sparse arrays are not allowed in scene literal`)
      }
      return literalToValue(el)
    })
  }
  if (ts.isObjectLiteralExpression(node)) {
    const obj: Record<string, unknown> = {}
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) {
        throw new Error(`Only "key: value" properties are allowed in scene literal (got ${ts.SyntaxKind[prop.kind]})`)
      }
      let key: string
      if (ts.isStringLiteral(prop.name) || ts.isNoSubstitutionTemplateLiteral(prop.name)) {
        key = prop.name.text
      } else if (ts.isIdentifier(prop.name) || ts.isNumericLiteral(prop.name)) {
        key = prop.name.text
      } else {
        throw new Error(`Unsupported property name in scene literal: ${ts.SyntaxKind[prop.name.kind]}`)
      }
      obj[key] = literalToValue(prop.initializer)
    }
    return obj
  }
  throw new Error(`Unsupported expression in scene literal: ${ts.SyntaxKind[node.kind]}`)
}

// ── Read / write ────────────────────────────────────────────────────────

/**
 * Read the `scene` export from main-entities.ts.
 * Returns null if missing / malformed (with logged error).
 */
export async function readMainEntities(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  workingDirectory: string
): Promise<Scene | null> {
  const filePath = mainEntitiesPath(workingDirectory)
  if (!(await fileExists(components.fs, filePath))) return null
  try {
    const buf = await components.fs.readFile(filePath)
    const text = typeof buf === 'string' ? buf : new TextDecoder().decode(buf)
    const parsed = parseSource(text)
    if (!parsed) {
      printError(
        components.logger,
        `${MAIN_ENTITIES_FILE} must export a const scene object literal`,
        new Error('shape')
      )
      return null
    }
    return parsed.scene
  } catch (err) {
    printError(components.logger, `Failed to parse ${MAIN_ENTITIES_FILE}`, err as Error)
    return null
  }
}

/**
 * Write a Scene back to main-entities.ts. If the file already exists, we
 * splice the new object literal into the original text (preserving the
 * preamble, imports, and surrounding comments). Otherwise we generate a
 * fresh file with a minimal template.
 */
export async function writeMainEntities(
  components: Pick<CliComponents, 'fs'>,
  workingDirectory: string,
  scene: Scene
): Promise<void> {
  const filePath = mainEntitiesPath(workingDirectory)
  const json = JSON.stringify(scene, null, 2)

  let body: string
  try {
    const buf = await components.fs.readFile(filePath)
    const text = typeof buf === 'string' ? buf : new TextDecoder().decode(buf)
    const parsed = parseSource(text)
    if (parsed) {
      body = text.slice(0, parsed.literalStart) + json + text.slice(parsed.literalEnd)
    } else {
      body = FILE_TEMPLATE + json + '\n'
    }
  } catch {
    body = FILE_TEMPLATE + json + '\n'
  }

  await components.fs.writeFile(filePath, body)
}

// ── Component-data normalizers ─────────────────────────────────────────
// Some protobuf components have repeated fields that the encoder iterates
// without defaulting to []. Authoring formats (and the editor) often omit
// these, so we fill in the defaults before passing to the typed component.

function normalizeMeshRenderer(value: any): any {
  const mesh = value?.mesh
  if (!mesh || !mesh.$case) return value
  const boxLike = (m: any) => ({ uvs: m?.uvs ?? [] })
  switch (mesh.$case) {
    case 'box':
      return { mesh: { $case: 'box', box: boxLike(mesh.box) } }
    case 'plane':
      return { mesh: { $case: 'plane', plane: boxLike(mesh.plane) } }
    case 'sphere':
      return { mesh: { $case: 'sphere', sphere: mesh.sphere ?? {} } }
    case 'cylinder':
      return { mesh: { $case: 'cylinder', cylinder: mesh.cylinder ?? {} } }
    case 'gltf':
      return { mesh: { $case: 'gltf', gltf: mesh.gltf ?? {} } }
    default:
      return value
  }
}

function normalizeMeshCollider(value: any): any {
  const out = normalizeMeshRenderer(value)
  if (value?.collisionMask !== undefined) out.collisionMask = value.collisionMask
  return out
}

interface RawTransform {
  position?: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number; w: number }
  scale?: { x: number; y: number; z: number }
  parent?: string
}

function normalizeTransform(raw: any): { position: any; rotation: any; scale: any } {
  const t = (raw ?? {}) as RawTransform
  // parent is intentionally NOT included here — it's resolved in pass 2 by
  // looking up the parent entity by name.
  return {
    position: t.position ?? { x: 0, y: 0, z: 0 },
    rotation: t.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
    scale: t.scale ?? { x: 1, y: 1, z: 1 }
  }
}

// ── Engine population ──────────────────────────────────────────────────

interface ComponentSetters {
  Name: ReturnType<typeof ecsComponents.Name>
  Transform: ReturnType<typeof ecsComponents.Transform>
  GltfContainer: ReturnType<typeof ecsComponents.GltfContainer>
  MeshRenderer: ReturnType<typeof ecsComponents.MeshRenderer>
  MeshCollider: ReturnType<typeof ecsComponents.MeshCollider>
  Material: ReturnType<typeof ecsComponents.Material>
  VisibilityComponent: ReturnType<typeof ecsComponents.VisibilityComponent>
  Billboard: ReturnType<typeof ecsComponents.Billboard>
  AudioSource: ReturnType<typeof ecsComponents.AudioSource>
  VideoPlayer: ReturnType<typeof ecsComponents.VideoPlayer>
  TextShape: ReturnType<typeof ecsComponents.TextShape>
  NftShape: ReturnType<typeof ecsComponents.NftShape>
  Animator: ReturnType<typeof ecsComponents.Animator>
}

function getOrDefineComponents(engine: IEngine): ComponentSetters {
  return {
    Name: ecsComponents.Name(engine),
    Transform: ecsComponents.Transform(engine),
    GltfContainer: ecsComponents.GltfContainer(engine),
    MeshRenderer: ecsComponents.MeshRenderer(engine),
    MeshCollider: ecsComponents.MeshCollider(engine),
    Material: ecsComponents.Material(engine),
    VisibilityComponent: ecsComponents.VisibilityComponent(engine),
    Billboard: ecsComponents.Billboard(engine),
    AudioSource: ecsComponents.AudioSource(engine),
    VideoPlayer: ecsComponents.VideoPlayer(engine),
    TextShape: ecsComponents.TextShape(engine),
    NftShape: ecsComponents.NftShape(engine),
    Animator: ecsComponents.Animator(engine)
  }
}

/**
 * Apply a Scene to an existing Engine instance. No-op if the scene is
 * empty. Throws on invalid parent references.
 *
 * Walks entries in two passes: first creates entities and assigns
 * components without parent resolution; second resolves Transform.parent
 * by name → entity ID (so forward references work).
 */
export function applySceneToEngine(engine: IEngine, scene: Scene): void {
  if (Object.keys(scene).length === 0) return

  const C = getOrDefineComponents(engine)
  const sortedNames = Object.keys(scene).sort()
  const nameToEntity = new Map<string, Entity>()

  for (const name of sortedNames) {
    const entry = scene[name]
    const entity = engine.addEntity()
    nameToEntity.set(name, entity)

    C.Name.createOrReplace(entity, { value: name })

    const components = (entry?.components ?? {}) as Record<string, any>

    if (components.Transform) {
      C.Transform.createOrReplace(entity, normalizeTransform(components.Transform))
    }
    if (components.GltfContainer) C.GltfContainer.createOrReplace(entity, components.GltfContainer)
    if (components.MeshRenderer) C.MeshRenderer.createOrReplace(entity, normalizeMeshRenderer(components.MeshRenderer))
    if (components.MeshCollider) C.MeshCollider.createOrReplace(entity, normalizeMeshCollider(components.MeshCollider))
    if (components.Material) C.Material.createOrReplace(entity, components.Material)
    if (components.VisibilityComponent) C.VisibilityComponent.createOrReplace(entity, components.VisibilityComponent)
    if (components.Billboard) C.Billboard.createOrReplace(entity, components.Billboard)
    if (components.AudioSource) C.AudioSource.createOrReplace(entity, components.AudioSource)
    if (components.VideoPlayer) C.VideoPlayer.createOrReplace(entity, components.VideoPlayer)
    if (components.TextShape) C.TextShape.createOrReplace(entity, components.TextShape)
    if (components.NftShape) C.NftShape.createOrReplace(entity, components.NftShape)
    if (components.Animator) C.Animator.createOrReplace(entity, components.Animator)
  }

  for (const name of sortedNames) {
    const entry = scene[name]
    const t = (entry?.components?.Transform ?? {}) as RawTransform
    if (!t.parent) continue
    const parentEntity = nameToEntity.get(t.parent)
    if (parentEntity === undefined) {
      throw new Error(`Entity "${name}" has parent "${t.parent}" which does not exist in ${MAIN_ENTITIES_FILE}`)
    }
    const entity = nameToEntity.get(name)!
    const transform = C.Transform.getMutable(entity)
    transform.parent = parentEntity
  }
}

/**
 * Build a fresh Engine populated solely from a Scene — used by the
 * /editor/changes POST handler to regenerate main.crdt out-of-band.
 */
export function buildEngineFromScene(scene: Scene): IEngine {
  const engine = Engine()
  applySceneToEngine(engine, scene)
  return engine
}
