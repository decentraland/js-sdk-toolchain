// eslint-disable-next-line @typescript-eslint/no-var-requires
const validator = require('gltf-validator')

import { BaseAsset, ModelAsset, ValidationError, Asset, isModelAsset, Gltf, AssetType } from './types'

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

async function getGltf(file: File, getExternalResource: (uri: string) => Promise<Uint8Array>): Promise<Gltf> {
  try {
    const buffer = await file.arrayBuffer()
    const result: Gltf = await validator.validateBytes(new Uint8Array(buffer), {
      ignoredIssues: IGNORED_ERROR_CODES,
      externalResourceFunction: getExternalResource
    })

    return result
  } catch (e) {
    const msg = `Unable to process model ${file.name}`
    console.log(msg, e)
    throw new Error(msg)
  }
}

async function validateGltf(gltf: Gltf): Promise<void> {
  const issues = gltf.issues.messages
  const errors = issues.filter((issue) => issue.severity === 0 && !IGNORED_ERROR_CODES.includes(issue.code))

  if (errors.length > 0) {
    const error = errors[0]
    throw new Error(error.message.replace('Node Exception: ', '').replace('Error: ', ''))
  }
}

export function normalizeFileName(fileName: string): string {
  return fileName.trim().replace(/\s+/g, '_').toLowerCase()
}

export function extractFileExtension(fileName: string): [string, string] {
  const match = fileName.match(/^(.*?)(?:\.([^.]+))?$/)
  return match ? [match[1], match[2]?.toLowerCase() || ''] : [fileName, '']
}

export function formatFileName(file: BaseAsset): string {
  return `${file.name}.${file.extension}`
}

function validateFileSize(size: number): ValidationError {
  return size <= ONE_GB_IN_BYTES ? undefined : { type: 'size', message: 'Max file size: 1 GB' }
}

function validateExtension(extension: string): ValidationError {
  return VALID_EXTENSIONS.has(extension) ? undefined : { type: 'type', message: `Invalid asset format ".${extension}"` }
}

async function processFile(file: File): Promise<BaseAsset> {
  const normalizedName = normalizeFileName(file.name)
  const [name, extension] = extractFileExtension(normalizedName)

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
    await validateGltf(model.gltf)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during GLTF validation'
    return { type: 'model', message }
  }
}

async function getModel(asset: BaseAsset, fileMap: Map<string, BaseAsset>): Promise<ModelAsset> {
  const gltf = await getGltf(asset.blob, async (uri: string) => {
    const resource = fileMap.get(normalizeFileName(uri))

    if (!resource) {
      throw new Error(`Resource "${uri}" is missing`)
    }

    const resourceBuffer = await resource.blob.arrayBuffer()
    return new Uint8Array(resourceBuffer)
  })

  const buffers: BaseAsset[] = []
  const images: BaseAsset[] = []

  for (const resource of gltf.info.resources || []) {
    if (resource.storage === 'external') {
      const normalizedName = normalizeFileName(resource.uri)
      const uri = fileMap.get(normalizedName)!
      if (resource.pointer.includes('buffer')) buffers.push(uri)
      if (resource.pointer.includes('image')) images.push(uri)
      fileMap.delete(normalizedName)
    }
  }

  fileMap.delete(formatFileName(asset))

  return { ...asset, gltf, buffers, images }
}

async function processModels(files: BaseAsset[]): Promise<Asset[]> {
  const fileMap = new Map(files.map((file) => [formatFileName(file), file]))

  const modelPromises = files
    .filter((asset) => MODEL_EXTENSIONS.includes(`.${asset.extension}`))
    .map(async (asset): Promise<ModelAsset> => {
      const model = await getModel(asset, fileMap)
      const error = await validateModelWithDependencies(model)
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

export function determineAssetType(extension: string): AssetType {
  switch (extension) {
    case 'gltf':
    case 'glb':
      return 'Models'
    case 'png':
    case 'jpg':
    case 'jpeg':
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

export function buildAssetPath(asset: Asset): string {
  const classification = determineAssetType(asset.extension)
  const assetPath = isModelAsset(asset) ? `${classification}/${asset.name}` : classification
  return assetPath
}
