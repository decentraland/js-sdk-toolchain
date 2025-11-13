import { globSync } from 'glob'
import path from 'path'
import { LastWriteWinElementSetComponentDefinition, Composite, Engine, IEngine, Entity } from '@dcl/ecs/dist-cjs'
import { EditorComponentNames, ScriptComponent, ScriptItem } from '@dcl/inspector'

import { CliComponents } from '../components'
import { printError } from './beautiful-logs'

type CompositeComponents = Pick<CliComponents, 'logger' | 'fs'>
type ScriptProvider = {
  add(entity: Entity, script: ScriptItem): void
}

type ScriptInfo = ScriptItem & {
  entity: Entity
}

export async function getAllComposites(
  components: CompositeComponents,
  workingDirectory: string
): Promise<{ watchFiles: string[]; compositeLines: string[]; scripts: Map<string, ScriptInfo[]>; withErrors: boolean }> {
  let withErrors = false
  const composites: Record<string, Composite.Definition> = {}
  const watchFiles = globSync('**/*.composite', { cwd: workingDirectory })
  const scripts = new Map<string, ScriptInfo[]>()

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

  const scriptProvider: ScriptProvider = {
    add(entity, script) {
      const importName = 'script_' + script.path
        .replace(/\.tsx?$/, '')  // remove .ts or .tsx
        .replace(/[^a-zA-Z0-9]/g, '_')  // sanitize
      const existingScripts = scripts.get(importName) || []
      existingScripts.push({ ...script, entity })
      scripts.set(importName, existingScripts)
    }
  }

  const compositeLines: string[] = []

  for (const compositeSource in composites) {
    const engine = Engine()
    try {
      const composite = compositeProvider.getCompositeOrNull(compositeSource)!
      Composite.instance(engine, composite, compositeProvider)
      extractScripts(engine, scriptProvider)
      compositeLines.push(`'${composite.src}':${JSON.stringify(Composite.toJson(composite.composite))}`)
    } catch (err: any) {
      printError(components.logger, `Composite '${compositeSource}' can't be instanced.`, err)
      withErrors = true
    }
  }

  return { compositeLines, watchFiles, scripts, withErrors }
}

function extractScripts(engine: IEngine, scriptProvider: ScriptProvider) {
  const ScriptComponent = engine.getComponentOrNull(EditorComponentNames.Script) as LastWriteWinElementSetComponentDefinition<ScriptComponent> | null
  if (!ScriptComponent) return

  for (const [entity, { value: scripts }] of engine.getEntitiesWith(ScriptComponent)) {
    for (const script of scripts) {
      scriptProvider.add(entity, script)
    }
  }
}
