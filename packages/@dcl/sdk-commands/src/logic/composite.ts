import { globSync } from 'glob'
import path from 'path'
import { CliComponents } from '../components'
import { Composite, Engine } from '@dcl/ecs/dist-cjs'
import { printError } from './beautiful-logs'

type CompositeComponents = Pick<CliComponents, 'logger' | 'fs'>

export async function getAllComposites(
  components: CompositeComponents,
  workingDirectory: string
): Promise<{ watchFiles: string[]; compositeLines: string[]; withErrors: boolean }> {
  let withErrors = false
  const composites: Record<string, Composite.Definition> = {}
  const watchFiles = globSync('**/*.composite', { cwd: workingDirectory })

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
      Composite.instance(engine, composite, compositeProvider)
      compositeLines.push(`'${composite.src}':${JSON.stringify(Composite.toJson(composite.composite))}`)
    } catch (err: any) {
      printError(components.logger, `Composite '${compositeSource}' can't be instanced.`, err)
      withErrors = true
    }
  }

  return { compositeLines, watchFiles, withErrors }
}
