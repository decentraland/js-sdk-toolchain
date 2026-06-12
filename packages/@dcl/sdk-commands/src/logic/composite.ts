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
import { applySceneToEngine, readMainEntities } from './main-entities'

type CompositeComponents = Pick<CliComponents, 'logger' | 'fs'>
type ScriptComponent = LastWriteWinElementSetComponentDefinition<EditorComponentsTypes['Script']>
type ScriptItem = EditorComponentsTypes['Script']['value'][number]
export type Script = ScriptItem & {
  entity: number
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
}> {
  let withErrors = false
  const composites: Record<string, Composite.Definition> = {}
  // Discover every composite so build-time recursion (`instanceComposite` →
  // `getCompositeOrNull(childCompositePath)`) can resolve nested references
  // embedded in `main.composite`. Only `main.composite` is later inlined into
  // the JS bundle (`compositeLines` below); secondary composites lazy-load at
  // runtime via `~system/Runtime.readFile`.
  const watchFiles = globSync('**/*.composite', { cwd: workingDirectory })
  if (watchFiles.length > 0) components.logger.debug(`[composite]   .composite: ${watchFiles.join(', ')}`)
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

  // Layer main-entities.ts (name-keyed authoring format) into the same
  // engine. Entity IDs come from engine.addEntity() and don't collide with
  // composite IDs because composites use direct mapping while addEntity
  // allocates fresh ones.
  try {
    const scene = await readMainEntities(components, workingDirectory)
    if (scene) {
      applySceneToEngine(engine, scene)
    }
  } catch (err) {
    printError(components.logger, `Failed to apply main-entities.ts to engine.`, err as Error)
    withErrors = true
  }

  // generate CRDT binary
  const crdtFilePath = path.join(workingDirectory, 'main.crdt')
  const crdtData = dumpEngineToCrdtCommands(engine as any)
  await components.fs.writeFile(crdtFilePath, crdtData)

  return {
    compositeLines,
    watchFiles,
    scripts,
    withErrors,
    maxCompositeEntity
  }
}
