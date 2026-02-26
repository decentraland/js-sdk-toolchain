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

      compositeLines.push(`'${composite.src}':${JSON.stringify(Composite.toJson(composite.composite))}`)
    } catch (err: any) {
      printError(components.logger, `Composite '${compositeSource}' can't be instanced.`, err)
      withErrors = true
    }
  }

  let maxCompositeEntity = 0
  for (const entity of (engine as any).entityContainer.getExistingEntities()) {
    const entityNumber = (entity & 0xffff) >>> 0
    if (entityNumber > maxCompositeEntity) {
      maxCompositeEntity = entityNumber
    }
  }

  // generate CRDT binary
  const crdtFilePath = path.join(workingDirectory, 'main.crdt')
  const crdtData = dumpEngineToCrdtCommands(engine as any)
  await components.fs.writeFile(crdtFilePath, crdtData)

  return { compositeLines, watchFiles, scripts, withErrors, maxCompositeEntity }
}
