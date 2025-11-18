import { globSync } from 'glob'
import path from 'path'
import {
  Composite,
  Engine,
  Entity,
  EntityMappingMode,
  LastWriteWinElementSetComponentDefinition
} from '@dcl/ecs/dist-cjs'
import { ComponentName, type Script as ScriptSchema } from '@dcl/inspector/node_modules/@dcl/asset-packs'

import { CliComponents } from '../components'
import { printError } from './beautiful-logs'

type CompositeComponents = Pick<CliComponents, 'logger' | 'fs'>
type ScriptComponent = LastWriteWinElementSetComponentDefinition<ScriptSchema>
type ScriptItem = ScriptSchema['value'][number]
type Script = ScriptItem & {
  entity: number
}

export async function getAllComposites(
  components: CompositeComponents,
  workingDirectory: string
): Promise<{ watchFiles: string[]; compositeLines: string[]; scripts: Map<string, Script[]>; withErrors: boolean }> {
  let withErrors = false
  const composites: Record<string, Composite.Definition> = {}
  const watchFiles = globSync('**/*.composite', { cwd: workingDirectory })
  const scripts = new Map<string, Script[]>()

  const textDecoder = new TextDecoder()
  for (const file of watchFiles) {
    try {
      const fileBuffer = await components.fs.readFile(path.join(workingDirectory, file))
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

  for (const compositeSource in composites) {
    const engine = Engine()
    try {
      const composite = compositeProvider.getCompositeOrNull(compositeSource)!
      Composite.instance(engine, composite, compositeProvider, {
        entityMapping: {
          type: EntityMappingMode.EMM_DIRECT_MAPPING,
          getCompositeEntity: (compositeEntity: Entity | number) => compositeEntity as Entity
        }
      })

      const ScriptComponent = engine.getComponentOrNull(ComponentName.SCRIPT) as ScriptComponent | null
      if (ScriptComponent) {
        for (const [entity, { value }] of engine.getEntitiesWith(ScriptComponent)) {
          for (const script of value) {
            const scriptInstances = scripts.get(script.path) || []
            scriptInstances.push({ ...script, entity })
            scripts.set(script.path, scriptInstances)
          }
        }
      }

      compositeLines.push(`'${composite.src}':${JSON.stringify(Composite.toJson(composite.composite))}`)
    } catch (err: any) {
      printError(components.logger, `Composite '${compositeSource}' can't be instanced.`, err)
      withErrors = true
    }
  }

  return { compositeLines, watchFiles, scripts, withErrors }
}
