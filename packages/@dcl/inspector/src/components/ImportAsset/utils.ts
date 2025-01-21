import { GLTFValidation } from '@babylonjs/loaders'

import { BaseAsset, GltfAsset, BabylonValidationIssue, ValidationError, Asset, Uri, GltfFile, isGltfAsset, AssetType } from './types'

const sampleIndex = (list: any[]) => Math.floor(Math.random() * list.length)

export function getRandomMnemonic() {
  return `${adjectives[sampleIndex(adjectives)]}-${nouns[sampleIndex(nouns)]}`
}

export const nouns = [
  'transportation',
  'chest',
  'variation',
  'director',
  'tale',
  'extent',
  'interaction',
  'exam',
  'combination',
  'movie',
  'literature',
  'significance',
  'member',
  'priority',
  'analyst',
  'audience',
  'food',
  'complaint',
  'wedding',
  'awareness',
  'outcome',
  'army',
  'resolution',
  'ratio',
  'baseball',
  'family',
  'excitement',
  'cheek',
  'payment',
  'freedom',
  'sir',
  'storage',
  'elevator',
  'satisfaction',
  'organization',
  'agency',
  'industry',
  'arrival',
  'thanks',
  'hall'
]

export const adjectives = [
  'cluttered',
  'tricky',
  'scandalous',
  'rampant',
  'abashed',
  'fallacious',
  'adventurous',
  'dizzy',
  'huge',
  'youthful',
  'succinct',
  'legal',
  'purring',
  'wise',
  'jagged',
  'smart',
  'learned',
  'relieved',
  'plain',
  'pushy',
  'vast',
  'heady',
  'vagabond',
  'disillusioned',
  'obese',
  'electric',
  'far',
  'unaccountable',
  'loud',
  'early',
  'wealthy',
  'long',
  'thinkable',
  'sordid',
  'striped',
  'violet',
  'likeable',
  'cheap',
  'absorbed'
]

export const ACCEPTED_FILE_TYPES = {
  'model/gltf-binary': ['.gltf', '.glb', '.bin'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'video/mp4': ['.mp4']
}

const ONE_GB_IN_BYTES = 1024 * 1024 * 1024
const VALID_EXTENSIONS = new Set(Object.values(ACCEPTED_FILE_TYPES).flat().map(($) => $.replaceAll('.', '')))
const IGNORED_ERROR_CODES = ['ACCESSOR_WEIGHTS_NON_NORMALIZED', 'MESH_PRIMITIVE_TOO_FEW_TEXCOORDS']

async function validateGltf(gltf: GltfAsset): Promise<void> {
  const pre = `Invalid GLTF "${gltf.blob.name}":`
  const gltfContent = JSON.parse(await gltf.blob.text()) as GltfFile
  const gltfBuffer = await gltf.blob.arrayBuffer()
  const resourceMap = new Map([...gltf.buffers, ...gltf.images].map(($) => [$.blob.name, $.blob]))

  // ugly hack since "GLTFValidation.ValidateAsync" runs on a new Worker and throwed errors from
  // "getExternalResource" callback are thrown to main thread
  // In conclusion, checking for missing files inside "getExternalResource" is not possible...
  for (const { uri } of [...gltfContent.buffers, ...gltfContent.images]) {
    if (!resourceMap.has(uri)) {
      throw new Error(`${pre}: resource "${uri}" is missing`)
    }
  }

  let result
  try {
    result = await GLTFValidation.ValidateAsync(new Uint8Array(gltfBuffer), '', '', (uri) => {
      const resource = resourceMap.get(uri)
      return resource!.arrayBuffer()
    })
  } catch (error) {
    throw new Error(`${pre}: ${error}`)
  }

  /*
    Babylon's type declarations incorrectly state that result.issues.messages
    is an Array<string>. In fact, it's an array of objects with useful properties.
  */
  const issues = result.issues.messages as unknown as BabylonValidationIssue[]

  const errors = issues.filter((issue) => issue.severity === 0 && !IGNORED_ERROR_CODES.includes(issue.code))

  if (errors.length > 0) {
    const error = errors[0]
    throw new Error(`${pre}: ${error.message} \n Check ${error.pointer}`)
  }
}

// Utility functions
function normalizeFileName(fileName: string): string {
  return fileName.trim().replace(/\s+/g, "_").toLowerCase()
}

function extractFileInfo(fileName: string): [string, string] {
  const match = fileName.match(/^(.*?)(?:\.([^.]+))?$/)
  return match ? [match[1], match[2]?.toLowerCase() || ""] : [fileName, ""]
}

export function formatFileName(file: BaseAsset): string {
  return `${file.name}.${file.extension}`
}

function validateFileSize(size: number): ValidationError {
  return size > ONE_GB_IN_BYTES ? 'Files bigger than 1GB are not accepted' : undefined
}

function validateExtension(extension: string): ValidationError {
  return VALID_EXTENSIONS.has(extension) ?
    undefined :
    `Invalid asset format ".${extension}"`
}

async function processFile(file: File): Promise<BaseAsset> {
  const normalizedName = normalizeFileName(file.name)
  const [name, extension] = extractFileInfo(normalizedName)

  const extensionError = validateExtension(extension)
  if (extensionError) {
    return { blob: file, name, extension, error: extensionError }
  }

  const sizeError = validateFileSize(file.size)
  if (sizeError) {
    return { blob: file, name, extension, error: sizeError }
  }

  return { blob: file, name, extension }
}

async function validateGltfWithDependencies(gltf: GltfAsset): Promise<ValidationError> {
  try {
    await validateGltf(gltf)
  } catch (error) {
    return error instanceof Error ? error.message : 'Unknown error during GLTF validation'
  }
}

function resolveDependencies(uris: Uri[], fileMap: Map<string, BaseAsset>): BaseAsset[] {
  return uris.reduce<BaseAsset[]>((acc, { uri }) => {
    const normalizedUri = normalizeFileName(uri)
    const file = fileMap.get(normalizedUri)
    if (file) {
      acc.push(file)
      fileMap.delete(normalizedUri)
    }
    return acc
  }, [])
}

async function processGltfAssets(files: BaseAsset[]): Promise<Asset[]> {
  const fileMap = new Map(files.map(file => [formatFileName(file), file]))

  const gltfPromises = files
    .filter(file => file.extension === 'gltf')
    .map(async (gltfFile): Promise<GltfAsset> => {
      const gltfContent = JSON.parse(await gltfFile.blob.text()) as GltfFile
      const buffers = resolveDependencies(gltfContent.buffers, fileMap)
      const images = resolveDependencies(gltfContent.images, fileMap)
      const gltf: GltfAsset = { ...gltfFile, buffers, images }
      const error = await validateGltfWithDependencies(gltf)

      fileMap.delete(formatFileName(gltfFile))
      return { ...gltf, error }
    })

  const gltfAssets = await Promise.all(gltfPromises)
  const remainingAssets = Array.from(fileMap.values())

  return [...gltfAssets, ...remainingAssets]
}

export async function processAssets(files: File[]): Promise<Asset[]> {
  const processedFiles = await Promise.all(files.map(processFile))
  return processGltfAssets(processedFiles)
}

export function normalizeBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  const roundedValue = Math.round(value * 100) / 100;
  return `${roundedValue} ${units[unitIndex]}`;
}

export function getAssetSize(asset: Asset): string {
  const resources = getAssetResources(asset)
  const sumSize = resources.reduce((size, resource) => size + resource.size, asset.blob.size)
  return normalizeBytes(sumSize)
}

export function getAssetResources(asset: Asset): File[] {
  if (!isGltfAsset(asset)) return []
  return [...asset.buffers, ...asset.images].map(($) => $.blob)
}

export function assetIsValid(asset: Asset): boolean {
  if (!asset.error) return true
  if (isGltfAsset(asset)) return !![...asset.buffers, ...asset.images].find(($) => assetIsValid($))
  return false
}

export function assetsAreValid(assets: Asset[]): boolean {
  return !!assets.find(($) => assetIsValid($))
}

export async function convertAssetToBinary(asset: Asset): Promise<Map<string, Uint8Array>> {
  const binaryContents: Map<string, Uint8Array> = new Map();
  const fullName = formatFileName(asset);
  const binary = await asset.blob.arrayBuffer();
  binaryContents.set(fullName, new Uint8Array(binary));

  if (isGltfAsset(asset)) {
    const resources = getAssetResources(asset);
    for (const resource of resources) {
      const resourceBinary = await resource.arrayBuffer();
      binaryContents.set(resource.name, new Uint8Array(resourceBinary));
    }
  }

  return binaryContents;
}

export function determineAssetType(asset: Asset): AssetType {
  switch (asset.extension) {
      case 'gltf':
      case 'glb':
        return 'models'
      case 'png':
      case 'jpg':
      case 'jpeg':
        return 'images'
      case 'mp3':
      case 'wav':
      case 'ogg':
        return 'audio'
      case 'mp4':
        return 'video'
      default:
        return 'other'
    }
}
