import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { BasicSourceMapConsumer, SourceMapConsumer, SourceNode } from 'source-map'
import { existsSync } from 'fs'

/**
 * This file contains function to ensure that a correct format is emitted for source maps
 */

export async function loadSourceMap(bundleFile: string) {
  const source = await readFile(bundleFile, 'utf8')
  if (!source.includes('//# sourceMappingURL=data:application/json;base64,'))
    throw new Error(`Source map not emitted for file ${bundleFile}`)

  const [file, sourceMapBase64] = source.split('//# sourceMappingURL=data:application/json;base64,')
  const sourceMap = Buffer.from(sourceMapBase64, 'base64').toString()
  const map = await new SourceMapConsumer(JSON.parse(sourceMap))
  const node = SourceNode.fromStringWithSourceMap(file, map)
  return { map, node }
}

export function assertFilesExist(map: BasicSourceMapConsumer) {
  console.log(`sourceRoot:`, map.sourceRoot)
  console.log(`sources:`, map.sources)

  // the source map should have a root, and it must be a file: url
  expect(map.sourceRoot.startsWith('file://')).toBeTruthy()

  // then check each file
  expect(map.sources.length).toBeGreaterThan(0)
  for (const file of map.sources) {
    expect(file.startsWith('file://')).toBeTruthy()

    // TODO: what should we do with virtual files?
    if (file.endsWith('sdk-composite:all-composites')) continue
    if (file.endsWith('entry-point.ts')) continue

    const fileExist = existsSync(fileURLToPath(file)) ? file : 'does not exit'
    expect(fileExist).toBe(file)
  }

  // to ensure a good developer experience we must provide sourcemaps for each file
  expect(map.hasContentsOfAllSources()).toBeTruthy()
}
