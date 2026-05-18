import { globSync } from 'glob'
import path from 'path'
import {
  Composite,
  Engine,
  Entity,
  EntityMappingMode,
  LastWriteWinElementSetComponentDefinition
} from '@dcl/ecs/dist-cjs'
import { EditorComponentNames, EditorComponentsTypes, dumpEngineToCrdtCommands } from '@dcl/inspector'

import { CliComponents } from '../components'
import { printError } from './beautiful-logs'

type CompositeComponents = Pick<CliComponents, 'logger' | 'fs'>
type ScriptComponent = LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Script']>
type ScriptItem = EditorComponentsTypes['Script']['value'][number]
export type Script = ScriptItem & {
  entity: number
}

export type ComponentRegistration = {
  name: string
  jsonSchema: any
}

const COMPOSITE_FILE_MAX_BYTES = 16 * 1024 * 1024 // 16 MB — sanity cap on hand-authored composites; rejects DoS-shaped inputs without bothering legitimate ones.

export async function getAllComposites(
  components: CompositeComponents,
  workingDirectory: string
): Promise<{
  watchFiles: string[]
  compositeLines: string[]
  scripts: Map<string, Script[]>
  withErrors: boolean
  maxCompositeEntity: number
  componentRegistrations: ComponentRegistration[]
}> {
  let withErrors = false
  const composites: Record<string, Composite.Definition> = {}
  // Discover every composite so build-time recursion (`instanceComposite` →
  // `getCompositeOrNull(childCompositePath)`) can resolve nested references
  // embedded in `main.composite`. Only `main.composite` is later inlined into
  // the JS bundle (`compositeLines` below); secondary composites lazy-load at
  // runtime via `~system/Runtime.readFile`.
  const watchFiles = globSync('**/*.composite', { cwd: workingDirectory })
  // Asset-packs ship composites under the `composite.json` convention (e.g.
  // `assets/asset-packs/fantasy_chest/composite.json`). We scan these for
  // component-schema pre-registration only — they are NOT instantiated into
  // the engine at build time (that would bake their entities into main.crdt
  // and defeat on-demand spawning via `engine.addEntityFromComposite`).
  // Scan asset-pack-style composites for component-schema pre-registration.
  // Explicitly exclude `node_modules` so a transitive dependency that ships
  // a `composite.json` cannot inject a component-schema definition that the
  // scene's auto-generated entrypoint then pre-registers (which would let
  // it shadow any non-`core::` component name).
  const additionalCompositeFiles = globSync('**/composite.json', {
    cwd: workingDirectory,
    ignore: ['node_modules/**', '**/node_modules/**']
  })
  components.logger.info(
    `[composite] scanning '${workingDirectory}': ${watchFiles.length} .composite, ${additionalCompositeFiles.length} composite.json file(s)`
  )
  if (watchFiles.length > 0) components.logger.debug(`[composite]   .composite: ${watchFiles.join(', ')}`)
  if (additionalCompositeFiles.length > 0)
    components.logger.debug(`[composite]   composite.json: ${additionalCompositeFiles.join(', ')}`)
  const scripts = new Map<string, Script[]>()

  const textDecoder = new TextDecoder()
  for (const file of watchFiles) {
    try {
      const fileBuffer = await components.fs.readFile(path.join(workingDirectory, file))
      if (fileBuffer.length > COMPOSITE_FILE_MAX_BYTES) {
        throw new Error(
          `Composite file '${file}' is ${fileBuffer.length} bytes (cap ${COMPOSITE_FILE_MAX_BYTES}); refusing to parse.`
        )
      }
      const json = JSON.parse(textDecoder.decode(fileBuffer))
      composites[file] = Composite.fromJson(json)
    } catch (err: any) {
      printError(
        components.logger,
        `Composite '${file}' can't be read. Please check if is a valid JSON and composite formated.`,
        err
      )
      withErrors = true
    }
  }

  const additionalComposites: Composite.Definition[] = []
  for (const file of additionalCompositeFiles) {
    try {
      const fileBuffer = await components.fs.readFile(path.join(workingDirectory, file))
      if (fileBuffer.length > COMPOSITE_FILE_MAX_BYTES) {
        components.logger.warn(
          `[composite] skipping '${file}': ${fileBuffer.length} bytes exceeds cap ${COMPOSITE_FILE_MAX_BYTES}`
        )
        continue
      }
      const json = JSON.parse(textDecoder.decode(fileBuffer))
      additionalComposites.push(Composite.fromJson(json))
    } catch (err: any) {
      // Not every `composite.json` in the tree is a valid composite definition
      // (some are unrelated config). Log at debug to keep the build output
      // quiet for legitimate non-composite JSON, but visible when investigating.
      const message = err?.message ? String(err.message).slice(0, 200) : String(err).slice(0, 200)
      components.logger.debug(`[composite] skipped '${file}': ${message}`)
    }
  }

  const compositeProvider: Composite.Provider = {
    getCompositeOrNull(src: string): Composite.Resource | null {
      if (src in composites) {
        return { src, composite: composites[src] }
      }
      return null
    }
  }

  const compositeLines: string[] = []

  const engine = Engine()
  for (const compositeSource in composites) {
    try {
      const composite = compositeProvider.getCompositeOrNull(compositeSource)!
      Composite.instance(engine, composite, compositeProvider, {
        entityMapping: {
          type: EntityMappingMode.EMM_DIRECT_MAPPING,
          getCompositeEntity: (compositeEntity: Entity | number) => compositeEntity as Entity
        }
      })

      const ScriptComponent = engine.getComponentOrNull(EditorComponentNames.Script) as ScriptComponent | null
      if (ScriptComponent) {
        for (const [entity, { value }] of engine.getEntitiesWith(ScriptComponent)) {
          for (const script of value) {
            const scriptInstances = scripts.get(script.path) || []
            scriptInstances.push({ ...script, entity })
            scripts.set(script.path, scriptInstances)
          }
        }
      }

      // Only inline `main.composite` into `~sdk/all-composites`. Secondary
      // composites stay on disk and are fetched at runtime via the provider's
      // `loadComposite` (see packages/@dcl/sdk/src/composite-provider.ts).
      if (compositeSource === 'main.composite') {
        compositeLines.push(`'${composite.src}':${JSON.stringify(Composite.toJson(composite.composite))}`)
      }
    } catch (err: any) {
      printError(components.logger, `Composite '${compositeSource}' can't be instanced.`, err)
      withErrors = true
    }
  }

  // Compute composite's highest entity number
  let maxCompositeEntity = 0
  for (const composite of Object.values(composites)) {
    for (const component of composite.components) {
      for (const entityId of component.data.keys()) {
        const entityNumber = (entityId & 0xffff) >>> 0
        if (entityNumber > maxCompositeEntity) {
          maxCompositeEntity = entityNumber
        }
      }
    }
  }

  // Collect every unique custom (non-core::) component schema carried by any
  // composite in the scene. The auto-generated entrypoint pre-registers these
  // at module-load via the virtual module `~sdk/composite-components` so that
  // runtime `engine.addEntityFromComposite` calls (post-seal) find every
  // component already defined, avoiding the "Engine is already sealed" throw
  // that would otherwise fire from `instanceComposite → defineComponentFromSchema`.
  const componentRegistrationsByName = new Map<string, ComponentRegistration>()
  const scanForComponents = [...Object.values(composites), ...additionalComposites]
  for (const composite of scanForComponents) {
    for (const component of composite.components) {
      if (!component.name || component.name.startsWith('core::')) continue
      if (component.jsonSchema === undefined || component.jsonSchema === null) continue
      if (componentRegistrationsByName.has(component.name)) continue
      componentRegistrationsByName.set(component.name, {
        name: component.name,
        jsonSchema: component.jsonSchema
      })
    }
  }
  const componentRegistrations = Array.from(componentRegistrationsByName.values())
  components.logger.info(
    `[composite] pre-registering ${componentRegistrations.length} unique custom component schema(s) for ~sdk/composite-components`
  )
  if (componentRegistrations.length > 0) {
    components.logger.debug(`[composite]   components: ${componentRegistrations.map((r) => r.name).join(', ')}`)
  }

  // generate CRDT binary
  const crdtFilePath = path.join(workingDirectory, 'main.crdt')
  const crdtData = dumpEngineToCrdtCommands(engine as any)
  await components.fs.writeFile(crdtFilePath, crdtData)

  return {
    compositeLines,
    watchFiles: [...watchFiles, ...additionalCompositeFiles],
    scripts,
    withErrors,
    maxCompositeEntity,
    componentRegistrations
  }
}

/**
 * Render the source text for the `~sdk/composite-components` virtual module.
 *
 * The returned code is injected pre-seal by the auto-generated scene entrypoint
 * (see `getEntrypointCode` in `bundle.ts`). It pre-registers `composite::root`
 * plus every custom (non-`core::`) component schema discovered in the scene's
 * composites, so runtime `engine.addEntityFromComposite` calls find each
 * component already defined and don't trip the engine's seal check.
 */
export function renderComponentRegistrationsModule(registrations: ComponentRegistration[]): string {
  const registrationLines = registrations
    .map(
      ({ name, jsonSchema }) =>
        `engine.defineComponentFromSchema(${JSON.stringify(name)}, Schemas.fromJson(${JSON.stringify(jsonSchema)}))`
    )
    .join('\n')

  return `import { engine, Schemas } from '@dcl/ecs'
import { getCompositeRootComponent } from '@dcl/ecs'
// Pre-register composite::root so runtime addEntityFromComposite recursion
// (via getCompositeRootComponent inside instanceComposite) doesn't trip the
// seal for scenes that have no main.composite to instance at scene boot.
getCompositeRootComponent(engine)
${registrationLines}
`
}
