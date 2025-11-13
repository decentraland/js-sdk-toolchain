import path from 'path'
import { IEngine } from '@dcl/ecs/dist-cjs'
import { validateBytes } from '@dcl/gltf-validator-ts'

import { CliComponents } from '../../components'
import { SceneProject } from '../../logic/project-validations'

/**
 * Asset Migrator for code-to-composite command
 *
 * This module handles migrating asset files to the Creator Hub directory structure:
 * - Models: assets/scene/Models/{modelName}/*.{gltf,glb} (with dependencies)
 * - Images: assets/scene/Images/*.{png,jpg,jpeg,bmp}
 * - Audio: assets/scene/Audio/*.{mp3,wav,ogg}
 * - Video: assets/scene/Video/*.{mp4}
 *
 * Models are treated specially: each model gets its own folder with all dependencies
 * (textures, .bin files) copied into it, even if originally shared between models.
 */

export type AssetType = 'Models' | 'Images' | 'Audio' | 'Video' | 'Other'

interface ModelDependencies {
  textures: string[]
  binaries: string[]
}

/**
 * Determines the asset type based on file extension
 */
function getAssetType(extension: string): AssetType {
  const ext = extension.toLowerCase().replace(/^\./, '')

  switch (ext) {
    case 'gltf':
    case 'glb':
      return 'Models'
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'bmp':
      return 'Images'
    case 'mp3':
    case 'wav':
    case 'ogg':
      return 'Audio'
    case 'mp4':
      return 'Video'
    default:
      return 'Other'
  }
}

/**
 * Checks if a string value looks like an asset path
 */
function looksLikeAssetPath(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) {
    return false
  }

  const ext = path.extname(value)
  if (!ext) {
    return false
  }

  return getAssetType(ext) !== 'Other'
}

/**
 * Extracts dependencies from a GLTF file using @dcl/gltf-validator-ts
 */
async function extractGltfDependencies(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  gltfPath: string
): Promise<ModelDependencies> {
  const { fs, logger } = components
  const dependencies: ModelDependencies = {
    textures: [],
    binaries: []
  }

  try {
    const gltfBuffer = await fs.readFile(gltfPath)

    const result = await validateBytes(new Uint8Array(gltfBuffer), {
      externalResourceFunction: () => Promise.resolve(new Uint8Array())
    })

    if (result.info && result.info.resources) {
      for (const resource of result.info.resources) {
        if (resource.storage === 'external' && resource.uri) {
          const uri = resource.uri

          if (resource.pointer && resource.pointer.includes('image')) {
            dependencies.textures.push(uri)
          } else if (resource.pointer && resource.pointer.includes('buffer')) {
            dependencies.binaries.push(uri)
          }
        }
      }
    }
  } catch (error) {
    logger.error(`  ⚠  Failed to extract dependencies from GLTF "${gltfPath}": ${error}`)
  }

  return dependencies
}

/**
 * Builds the destination path following Creator Hub conventions
 */
function getDestinationPath(sceneRoot: string, originalPath: string): string {
  const fileName = path.basename(originalPath)
  const extension = path.extname(originalPath)
  const assetType = getAssetType(extension)

  if (assetType === 'Models') {
    // Models get their own folder: assets/scene/Models/{modelName}/file.glb
    const modelName = path.basename(originalPath, extension)
    return path.join(sceneRoot, 'assets', 'scene', 'Models', modelName, fileName)
  }

  // Other assets go directly in type folder: assets/scene/Images/file.png
  return path.join(sceneRoot, 'assets', 'scene', assetType, fileName)
}

/**
 * Recursively finds all asset paths in component data
 */
function collectAssetPaths(data: any, assetPaths: Set<string>): void {
  if (data === null || data === undefined) {
    return
  }

  if (typeof data === 'string') {
    if (looksLikeAssetPath(data)) {
      assetPaths.add(data)
    }
    return
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      collectAssetPaths(item, assetPaths)
    }
    return
  }

  if (typeof data === 'object') {
    for (const value of Object.values(data)) {
      collectAssetPaths(value, assetPaths)
    }
  }
}

/**
 * Recursively replaces asset paths in component data
 * Returns an object with the updated data and a flag indicating if changes were made
 */
function replaceAssetPaths(
  data: any,
  pathMapping: Map<string, string>
): { data: any; hasChanges: boolean } {
  if (data === null || data === undefined) {
    return { data, hasChanges: false }
  }

  if (typeof data === 'string') {
    const newPath = pathMapping.get(data)
    if (newPath !== undefined) {
      return { data: newPath, hasChanges: true }
    }
    return { data, hasChanges: false }
  }

  if (Array.isArray(data)) {
    let hasChanges = false
    const result = data.map((item) => {
      const replaced = replaceAssetPaths(item, pathMapping)
      if (replaced.hasChanges) hasChanges = true
      return replaced.data
    })
    return { data: result, hasChanges }
  }

  if (typeof data === 'object') {
    let hasChanges = false
    const result: any = {}
    for (const [key, value] of Object.entries(data)) {
      const replaced = replaceAssetPaths(value, pathMapping)
      if (replaced.hasChanges) hasChanges = true
      result[key] = replaced.data
    }
    return { data: result, hasChanges }
  }

  return { data, hasChanges: false }
}

/**
 * Main asset migration function
 *
 * Process:
 * 1. Scan all components to find asset references
 * 2. Copy asset files to new Creator Hub structure
 * 3. Update all components with new asset paths
 */
export async function migrateAssets(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  project: SceneProject,
  engine: IEngine
): Promise<number> {
  const { fs, logger } = components
  const sceneRoot = project.workingDirectory

  // Step 1: find all asset paths in the engine
  const assetPaths = new Set<string>()
  for (const component of engine.componentsIter()) {
    for (const [entity] of engine.getEntitiesWith(component)) {
      const componentData = component.get(entity)
      if (componentData) {
        collectAssetPaths(componentData, assetPaths)
      }
    }
  }

  if (assetPaths.size === 0) {
    logger.log('No assets found to migrate')
    return 0
  }

  logger.log(`Found ${assetPaths.size} asset reference(s)`)

  // Step 2: copy files to new locations
  const pathMapping = new Map<string, string>()

  for (const originalPath of assetPaths) {
    const absoluteOriginalPath = path.isAbsolute(originalPath) ? originalPath : path.join(sceneRoot, originalPath)

    if (!(await fs.fileExists(absoluteOriginalPath))) {
      logger.warn(`  ⚠  Asset not found: ${originalPath}`)
      continue
    }

    const assetType = getAssetType(path.extname(originalPath))
    const newAbsolutePath = getDestinationPath(sceneRoot, originalPath)
    const newRelativePath = path.relative(sceneRoot, newAbsolutePath)

    await fs.mkdir(path.dirname(newAbsolutePath), { recursive: true })
    await fs.copyFile(absoluteOriginalPath, newAbsolutePath)

    pathMapping.set(originalPath, newRelativePath)

    logger.log(`  ✓  ${originalPath} → ${newRelativePath}`)

    // special handling for models: copy dependencies
    if (assetType === 'Models') {
      const dependencies = await extractGltfDependencies(components, absoluteOriginalPath)

      if (dependencies.textures.length === 0 && dependencies.binaries.length === 0) {
        continue
      }

      const allDependencies = [...dependencies.textures, ...dependencies.binaries]

      for (const depFileName of allDependencies) {
        const depOriginalPath = path.join(path.dirname(absoluteOriginalPath), depFileName)

        if (await fs.fileExists(depOriginalPath)) {
          const depNewPath = path.join(path.dirname(newAbsolutePath), depFileName)

          await fs.copyFile(depOriginalPath, depNewPath)

          const depOriginalRelative = path.join(path.dirname(originalPath), depFileName)
          const depNewRelative = path.relative(sceneRoot, depNewPath)
          pathMapping.set(depOriginalRelative, depNewRelative)

          logger.log(`    ↳  ${depFileName}`)
        }
      }
    }
  }

  logger.log(`Migrated ${pathMapping.size} asset file(s)`)

  // Step 3: update components with new paths
  let updatedCount = 0

  for (const component of engine.componentsIter()) {
    for (const [entity] of engine.getEntitiesWith(component)) {
      const componentData = component.get(entity)

      if (componentData) {
        const { data: updatedData, hasChanges } = replaceAssetPaths(componentData, pathMapping)

        if (hasChanges) {
          // only supporting LastWriteWinElementSetComponentDefinition (inspector does the same thing)
          if ('createOrReplace' in component) {
            component.createOrReplace(entity, updatedData)
            updatedCount++
          }
        }
      }
    }
  }

  return updatedCount
}
