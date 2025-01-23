import { GLTFValidation } from '@babylonjs/loaders'

import {
  BaseAsset,
  ModelAsset,
  BabylonValidationIssue,
  ValidationError,
  Asset,
  Uri,
  GltfFile,
  isModelAsset,
  AssetType
} from './types'

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
  'model/gltf-binary': ['.gltf', '.glb'],
  'application/octet-stream': ['.bin'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'video/mp4': ['.mp4']
}

const ONE_GB_IN_BYTES = 1024 * 1024 * 1024
const VALID_EXTENSIONS = new Set(
  Object.values(ACCEPTED_FILE_TYPES)
    .flat()
    .map(($) => $.replaceAll('.', ''))
)
const MODEL_EXTENSIONS = ACCEPTED_FILE_TYPES['model/gltf-binary']
const IGNORED_ERROR_CODES = [
  'ACCESSOR_WEIGHTS_NON_NORMALIZED',
  'MESH_PRIMITIVE_TOO_FEW_TEXCOORDS',
  'ACCESSOR_VECTOR3_NON_UNIT'
]

async function validateModel(model: ModelAsset): Promise<void> {
  const buffer = await model.blob.arrayBuffer()
  const resourcesArr: [string, File][] = [...model.buffers, ...model.images].map(($) => [$.blob.name, $.blob])
  const resourceMap = new Map(resourcesArr)

  // ugly hack since "GLTFValidation.ValidateAsync" runs on a new Worker and throwed errors from
  // "getExternalResource" callback are thrown to main thread
  // In conclusion, checking for missing files inside "getExternalResource" is not possible...
  for (const uri of [...model.gltf.buffers, ...model.gltf.images]) {
    const _uri = getUri(uri)
    if (_uri === model.name) continue // a model can include an entry with the same name as the model inside buffer resources...
    if (!_uri || !resourceMap.has(_uri)) {
      throw new Error(`Resource "${_uri}" is missing`)
    }
  }

  const result = await GLTFValidation.ValidateAsync(new Uint8Array(buffer), '', '', (uri) => {
    const resource = resourceMap.get(uri)
    return resource!.arrayBuffer()
  })

  /*
    Babylon's type declarations incorrectly state that result.issues.messages
    is an Array<string>. In fact, it's an array of objects with useful properties.
  */
  const issues = result.issues.messages as unknown as BabylonValidationIssue[]

  const errors = issues.filter((issue) => issue.severity === 0 && !IGNORED_ERROR_CODES.includes(issue.code))

  if (errors.length > 0) {
    const error = errors[0]
    throw new Error(`${error.message} \n Check ${error.pointer}`)
  }
}

// Utility functions
function normalizeFileName(fileName: string): string {
  return fileName.trim().replace(/\s+/g, '_').toLowerCase()
}

function extractFileInfo(fileName: string): [string, string] {
  const match = fileName.match(/^(.*?)(?:\.([^.]+))?$/)
  return match ? [match[1], match[2]?.toLowerCase() || ''] : [fileName, '']
}

export function formatFileName(file: BaseAsset): string {
  return `${file.name}.${file.extension}`
}

function validateFileSize(size: number): ValidationError {
  return size <= ONE_GB_IN_BYTES ? undefined : { type: 'size', message: 'Files bigger than 1GB are not accepted' }
}

function validateExtension(extension: string): ValidationError {
  return VALID_EXTENSIONS.has(extension) ? undefined : { type: 'type', message: `Invalid asset format ".${extension}"` }
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

async function validateModelWithDependencies(model: ModelAsset): Promise<ValidationError> {
  try {
    await validateModel(model)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during GLTF validation'
    return { type: 'model', message }
  }
}

function getUri(uri: Uri): string | undefined {
  return (uri as any).uri || (uri as any).name
}

function resolveDependencies(items: Uri[], fileMap: Map<string, BaseAsset>): BaseAsset[] {
  return items.reduce<BaseAsset[]>((acc, item) => {
    const uri = getUri(item)
    if (!uri) return acc
    const normalizedUri = normalizeFileName(uri)
    const file = fileMap.get(normalizedUri)
    if (file) {
      acc.push(file)
      fileMap.delete(normalizedUri)
    }
    return acc
  }, [])
}

async function getGlbMetadata(asset: BaseAsset): Promise<GltfFile> {
  const file = asset.blob
  const decoder = new TextDecoder()
  const reader = file.stream().getReader()
  let gltf: GltfFile = { buffers: [], images: [] }
  let buffer = ''
  let jsonFound = false
  let braceDepth = 0

  const getEndIndex = (data: string): number => {
    for (let i = 0; i < data.length; i++) {
      if (data[i] === '{') braceDepth++
      else if (data[i] === '}') {
        braceDepth--
        if (braceDepth === 0) {
          return i
        }
      }
    }
    return -1
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      let chunk = decoder.decode(value, { stream: true })

      if (!jsonFound) {
        const startIndex = chunk.indexOf('JSON{')
        if (startIndex === -1) continue
        jsonFound = true
        buffer = chunk.slice(startIndex + 4) // +4 for "JSON" keyword
        chunk = buffer // opmitimization for always reading from chunks when looking for "endIndex" instead of reading the whole buffer on every iteration
      } else {
        buffer += chunk
      }

      const endIndex = getEndIndex(chunk)
      if (endIndex !== -1) {
        gltf = JSON.parse(buffer.slice(0, endIndex + 1))
        break
      }
    }
  } catch (_) {
  } finally {
    reader.releaseLock()
    return gltf
  }
}

async function getModelInfo(asset: BaseAsset): Promise<GltfFile> {
  switch (asset.extension) {
    case 'gltf':
      return JSON.parse(await asset.blob.text()) as GltfFile
    case 'glb':
      return getGlbMetadata(asset)
  }

  return { buffers: [], images: [] }
}

async function processModels(files: BaseAsset[]): Promise<Asset[]> {
  const fileMap = new Map(files.map((file) => [formatFileName(file), file]))

  const modelPromises = files
    .filter((asset) => MODEL_EXTENSIONS.includes(`.${asset.extension}`))
    .map(async (asset): Promise<ModelAsset> => {
      const gltf = await getModelInfo(asset)
      const buffers = resolveDependencies(gltf.buffers, fileMap)
      const images = resolveDependencies(gltf.images, fileMap)
      const model: ModelAsset = { ...asset, gltf, buffers, images }
      const error = await validateModelWithDependencies(model)

      fileMap.delete(formatFileName(asset))
      return { ...model, error }
    })

  const gltfAssets = await Promise.all(modelPromises)
  const remainingAssets = Array.from(fileMap.values())

  return [...gltfAssets, ...remainingAssets]
}

export async function processAssets(files: File[]): Promise<Asset[]> {
  const processedFiles = await Promise.all(files.map(processFile))
  return processModels(processedFiles)
}

export function normalizeBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  const roundedValue = Math.round(value * 100) / 100
  return `${roundedValue} ${units[unitIndex]}`
}

export function getAssetSize(asset: Asset): string {
  const resources = getAssetResources(asset)
  const sumSize = resources.reduce((size, resource) => size + resource.size, asset.blob.size)
  return normalizeBytes(sumSize)
}

export function getAssetResources(asset: Asset): File[] {
  if (!isModelAsset(asset)) return []
  return [...asset.buffers, ...asset.images].map(($) => $.blob)
}

export function assetIsValid(asset: Asset): boolean {
  if (!!asset.error) return false
  if (isModelAsset(asset)) return [...asset.buffers, ...asset.images].every(($) => assetIsValid($))
  return true
}

export function assetsAreValid(assets: Asset[]): boolean {
  return assets.every(($) => assetIsValid($))
}

export async function convertAssetToBinary(asset: Asset): Promise<Map<string, Uint8Array>> {
  const binaryContents: Map<string, Uint8Array> = new Map()
  const fullName = formatFileName(asset)
  const binary = await asset.blob.arrayBuffer()
  binaryContents.set(fullName, new Uint8Array(binary))

  if (isModelAsset(asset)) {
    const resources = getAssetResources(asset)
    for (const resource of resources) {
      const resourceBinary = await resource.arrayBuffer()
      binaryContents.set(resource.name, new Uint8Array(resourceBinary))
    }
  }

  return binaryContents
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
