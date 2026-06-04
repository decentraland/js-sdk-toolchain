import path from 'path'
import { Result } from 'arg'
import { CliComponents } from '../../components'
import { colors } from '../../components/log'
import { declareArgs } from '../../logic/args'
import { printCommand, printStep, printSuccess, printWarning } from '../../logic/beautiful-logs'
import { b64HashingFunction } from '../../logic/project-files'

interface Options {
  args: Result<typeof args>
  components: Pick<CliComponents, 'fs' | 'logger' | 'analytics'>
}

export const args = declareArgs({
  '--dir': String,
  '--basecolor-size': Number,
  '--normal-size': Number,
  '--orm-size': Number,
  '--emissive-size': Number,
  '--other-size': Number,
  '--quality': Number,
  '--format': String,
  '--dry-run': Boolean,
  '-q': '--quality',
  '-f': '--format',
  '-d': '--dir'
})

export function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands optimize [options]'

    Extract textures embedded in GLB files and compress all image textures
    in your scene's assets/ and Models/ directories.

    GLB files with embedded textures are automatically detected. Textures
    are extracted to the same directory as the GLB and the GLB is rewritten
    to reference external files. Then all images (both pre-existing and
    extracted) are compressed based on their type.

    Textures are classified by filename convention (e.g. _baseColor,
    _normal, _orm, _emissive) or by their material slot in the GLB.

    Options:
      -h,  --help                Displays complete help
      -d,  --dir <path>          Project directory (default: .)
      -q,  --quality <1-100>     Compression quality for JPEG/WebP (default: 85)
      -f,  --format <fmt>        Output format: png, jpeg, webp (default: png)
           --basecolor-size <px>  Max height for baseColor textures (default: 1024)
           --normal-size <px>     Max height for normal maps (default: 1024)
           --orm-size <px>        Max height for ORM textures (default: 512)
           --emissive-size <px>   Max height for emissive textures (default: 512)
           --other-size <px>      Max height for other textures (default: 512)
           --dry-run              Show what would be optimized without writing

    Example:
    - Optimize with defaults:
      '$ sdk-commands optimize'

    - Optimize with JPEG output at quality 80:
      '$ sdk-commands optimize --format jpeg --quality 80'

    - Optimize with higher baseColor resolution:
      '$ sdk-commands optimize --basecolor-size 2048'
  `)
}

type TextureType = 'baseColor' | 'normal' | 'orm' | 'emissive' | 'other'

interface CompressionSettings {
  baseColorSize: number
  normalSize: number
  ormSize: number
  emissiveSize: number
  otherSize: number
  quality: number
  format: 'png' | 'jpeg' | 'webp'
}

interface OptimizationResult {
  path: string
  originalSize: number
  optimizedSize: number
  skipped: boolean
  reason?: string
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']
const SUFFIX_REGEX = /_(baseColor|normal|orm|metallicRoughness|occlusion|emissive)\./i
const ASSET_DIRS = ['assets', 'Models']
const GLB_MAGIC = 0x46546c67
const GLB_JSON_CHUNK = 0x4e4f534a
const GLB_BIN_CHUNK = 0x004e4942

const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp'
}

function classifyTexture(filePath: string): TextureType {
  const match = filePath.match(SUFFIX_REGEX)
  if (!match) return 'other'
  const suffix = match[1].toLowerCase()
  if (suffix === 'metallicroughness' || suffix === 'occlusion') return 'orm'
  if (suffix === 'basecolor') return 'baseColor'
  return suffix as TextureType
}

function getMaxHeight(type: TextureType, settings: CompressionSettings): number {
  switch (type) {
    case 'baseColor':
      return settings.baseColorSize
    case 'normal':
      return settings.normalSize
    case 'orm':
      return settings.ormSize
    case 'emissive':
      return settings.emissiveSize
    default:
      return settings.otherSize
  }
}

function isImageFile(filePath: string): boolean {
  return IMAGE_EXTENSIONS.some((ext) => filePath.toLowerCase().endsWith(ext))
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '_')
}

// --- GLB binary parsing ---

interface GlbChunks {
  json: any
  binaryChunk: Buffer
}

function parseGlb(buffer: Buffer): GlbChunks | null {
  if (buffer.length < 12) return null
  if (buffer.readUInt32LE(0) !== GLB_MAGIC) return null

  if (buffer.length < 20) return null
  const jsonChunkLength = buffer.readUInt32LE(12)
  if (buffer.readUInt32LE(16) !== GLB_JSON_CHUNK) return null

  const jsonStr = buffer.subarray(20, 20 + jsonChunkLength).toString('utf8').trimEnd()
  let json: any
  try {
    json = JSON.parse(jsonStr)
  } catch {
    return null
  }

  const binChunkStart = 20 + jsonChunkLength
  let binaryChunk: Buffer = Buffer.alloc(0)
  if (binChunkStart + 8 <= buffer.length) {
    const binChunkLength = buffer.readUInt32LE(binChunkStart)
    if (buffer.readUInt32LE(binChunkStart + 4) === GLB_BIN_CHUNK) {
      binaryChunk = Buffer.from(buffer.subarray(binChunkStart + 8, binChunkStart + 8 + binChunkLength))
    }
  }

  return { json, binaryChunk }
}

function rebuildGlb(json: any, binaryChunk: Buffer): Buffer {
  let jsonStr = JSON.stringify(json)
  while (Buffer.byteLength(jsonStr, 'utf8') % 4 !== 0) jsonStr += ' '
  const jsonBuf = Buffer.from(jsonStr, 'utf8')

  const binPadding = binaryChunk.length > 0 ? (4 - (binaryChunk.length % 4)) % 4 : 0
  const paddedBin = binPadding > 0 ? Buffer.concat([binaryChunk, Buffer.alloc(binPadding, 0)]) : binaryChunk

  const hasBin = paddedBin.length > 0
  const totalLength = 12 + 8 + jsonBuf.length + (hasBin ? 8 + paddedBin.length : 0)
  const out = Buffer.alloc(totalLength)

  out.writeUInt32LE(GLB_MAGIC, 0)
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(totalLength, 8)

  out.writeUInt32LE(jsonBuf.length, 12)
  out.writeUInt32LE(GLB_JSON_CHUNK, 16)
  jsonBuf.copy(out, 20)

  if (hasBin) {
    const binOffset = 20 + jsonBuf.length
    out.writeUInt32LE(paddedBin.length, binOffset)
    out.writeUInt32LE(GLB_BIN_CHUNK, binOffset + 4)
    paddedBin.copy(out, binOffset + 8)
  }

  return out
}

const SLOT_MAP: Record<string, TextureType> = {
  baseColorTexture: 'baseColor',
  metallicRoughnessTexture: 'orm',
  normalTexture: 'normal',
  occlusionTexture: 'orm',
  emissiveTexture: 'emissive'
}

const CATEGORY_PRIORITY: Record<string, number> = {
  baseColor: 5,
  normal: 4,
  orm: 3,
  emissive: 2,
  other: 1
}

function buildImageCategoryMap(gltf: any): Map<number, TextureType> {
  const categoryMap = new Map<number, TextureType>()

  const textureToImage = new Map<number, number>()
  for (let i = 0; i < (gltf.textures || []).length; i++) {
    const tex = gltf.textures[i]
    if (tex.source !== undefined) {
      textureToImage.set(i, tex.source)
    }
  }

  for (const mat of gltf.materials || []) {
    const slots: [string, any][] = []
    const pbr = mat.pbrMetallicRoughness
    if (pbr) {
      if (pbr.baseColorTexture) slots.push(['baseColorTexture', pbr.baseColorTexture])
      if (pbr.metallicRoughnessTexture) slots.push(['metallicRoughnessTexture', pbr.metallicRoughnessTexture])
    }
    if (mat.normalTexture) slots.push(['normalTexture', mat.normalTexture])
    if (mat.occlusionTexture) slots.push(['occlusionTexture', mat.occlusionTexture])
    if (mat.emissiveTexture) slots.push(['emissiveTexture', mat.emissiveTexture])

    for (const [slotName, texInfo] of slots) {
      const texIndex = texInfo?.index
      if (texIndex === undefined) continue
      const imageIndex = textureToImage.get(texIndex)
      if (imageIndex === undefined) continue

      const category = SLOT_MAP[slotName] || 'other'
      const existing = categoryMap.get(imageIndex)
      if (!existing || (CATEGORY_PRIORITY[category] || 0) > (CATEGORY_PRIORITY[existing] || 0)) {
        categoryMap.set(imageIndex, category)
      }
    }
  }

  return categoryMap
}

function findReferencedBufferViews(gltf: any): Set<number> {
  const refs = new Set<number>()

  for (const accessor of gltf.accessors || []) {
    if (accessor.bufferView !== undefined) refs.add(accessor.bufferView)
    if (accessor.sparse?.indices?.bufferView !== undefined) refs.add(accessor.sparse.indices.bufferView)
    if (accessor.sparse?.values?.bufferView !== undefined) refs.add(accessor.sparse.values.bufferView)
  }

  for (const image of gltf.images || []) {
    if (image.bufferView !== undefined) refs.add(image.bufferView)
  }

  for (const mesh of gltf.meshes || []) {
    for (const prim of mesh.primitives || []) {
      const draco = prim.extensions?.KHR_draco_mesh_compression
      if (draco?.bufferView !== undefined) refs.add(draco.bufferView)
    }
  }

  return refs
}

function compactBinaryChunk(gltf: any, binaryChunk: Buffer, orphanedBVs: Set<number>): Buffer {
  const bufferViews = gltf.bufferViews || []
  if (orphanedBVs.size === 0) return binaryChunk

  const pieces: { index: number; data: Buffer }[] = []
  for (let i = 0; i < bufferViews.length; i++) {
    if (orphanedBVs.has(i)) continue
    const bv = bufferViews[i]
    const offset = bv.byteOffset || 0
    pieces.push({ index: i, data: binaryChunk.subarray(offset, offset + bv.byteLength) })
  }

  let newOffset = 0
  for (const piece of pieces) {
    newOffset = (newOffset + 3) & ~3
    bufferViews[piece.index].byteOffset = newOffset
    newOffset += piece.data.length
  }

  const totalSize = (newOffset + 3) & ~3
  const newBinaryChunk = Buffer.alloc(totalSize)
  for (const piece of pieces) {
    piece.data.copy(newBinaryChunk, bufferViews[piece.index].byteOffset)
  }

  if (gltf.buffers && gltf.buffers.length > 0) {
    gltf.buffers[0].byteLength = totalSize
  }

  return newBinaryChunk
}

interface ExtractionResult {
  extractedFiles: string[]
  embeddedCount: number
  originalGlbSize: number
  newGlbSize: number
}

async function extractGlbTextures(
  components: Pick<CliComponents, 'fs'>,
  glbPath: string,
  usedNames: Set<string>,
  dryRun: boolean
): Promise<ExtractionResult> {
  const buffer = Buffer.from(await components.fs.readFile(glbPath))
  const parsed = parseGlb(buffer)
  if (!parsed) return { extractedFiles: [], embeddedCount: 0, originalGlbSize: buffer.length, newGlbSize: buffer.length }

  const { json: gltf, binaryChunk } = parsed
  const images: any[] = gltf.images || []
  const bufferViews: any[] = gltf.bufferViews || []

  const embeddedImages = images.filter((img: any) => img.bufferView !== undefined)
  if (embeddedImages.length === 0) {
    return { extractedFiles: [], embeddedCount: 0, originalGlbSize: buffer.length, newGlbSize: buffer.length }
  }

  if (dryRun) {
    return { extractedFiles: [], embeddedCount: embeddedImages.length, originalGlbSize: buffer.length, newGlbSize: buffer.length }
  }

  const categoryMap = buildImageCategoryMap(gltf)
  const dir = path.dirname(glbPath)
  const extractedFiles: string[] = []

  const refsBefore = findReferencedBufferViews(gltf)

  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    if (image.bufferView === undefined) continue

    const bv = bufferViews[image.bufferView]
    if (!bv) continue

    const offset = bv.byteOffset || 0
    const length = bv.byteLength
    const imageData = binaryChunk.subarray(offset, offset + length)

    const category = categoryMap.get(i) || classifyTexture(image.name || '')
    const ext = MIME_TO_EXT[image.mimeType] || '.png'

    let baseName: string
    if (image.name) {
      let name = sanitizeFilename(image.name)
      const nameExt = path.extname(name).toLowerCase()
      if (IMAGE_EXTENSIONS.includes(nameExt)) {
        name = name.slice(0, -nameExt.length)
      }
      baseName = name
    } else {
      baseName = `texture_${category}_${i}`
    }

    let filename = baseName + ext
    let counter = 2
    while (usedNames.has(filename.toLowerCase())) {
      filename = `${baseName}_${counter}${ext}`
      counter++
    }
    usedNames.add(filename.toLowerCase())

    const outputPath = path.join(dir, filename)
    await components.fs.writeFile(outputPath, imageData)
    extractedFiles.push(outputPath)

    image.uri = filename
    delete image.bufferView
  }

  const refsAfter = findReferencedBufferViews(gltf)
  const orphanedBVs = new Set([...refsBefore].filter((bv) => !refsAfter.has(bv)))
  const compactedBin = compactBinaryChunk(gltf, binaryChunk, orphanedBVs)

  const newGlb = rebuildGlb(gltf, compactedBin)
  await components.fs.writeFile(glbPath, newGlb)

  return {
    extractedFiles,
    embeddedCount: embeddedImages.length,
    originalGlbSize: buffer.length,
    newGlbSize: newGlb.length
  }
}

// --- File collection ---

async function collectFiles(
  components: Pick<CliComponents, 'fs'>,
  workingDirectory: string
): Promise<{ imageFiles: string[]; glbFiles: string[] }> {
  const imageFiles: string[] = []
  const glbFiles: string[] = []

  for (const dir of ASSET_DIRS) {
    const fullDir = path.join(workingDirectory, dir)
    if (!(await components.fs.directoryExists(fullDir))) continue
    await walkDir(components, fullDir, imageFiles, glbFiles)
  }

  return { imageFiles, glbFiles }
}

async function walkDir(
  components: Pick<CliComponents, 'fs'>,
  dirPath: string,
  imageFiles: string[],
  glbFiles: string[]
): Promise<void> {
  const entries = await components.fs.readdir(dirPath)
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry)
    try {
      const stat = await components.fs.stat(fullPath)
      if (stat.isDirectory()) {
        await walkDir(components, fullPath, imageFiles, glbFiles)
      } else if (isImageFile(entry)) {
        imageFiles.push(fullPath)
      } else if (entry.toLowerCase().endsWith('.glb')) {
        glbFiles.push(fullPath)
      }
    } catch {
      // skip inaccessible entries
    }
  }
}

// --- Image optimization ---

async function optimizeImage(
  components: Pick<CliComponents, 'fs'>,
  filePath: string,
  settings: CompressionSettings,
  dryRun: boolean
): Promise<OptimizationResult> {
  const type = classifyTexture(filePath)
  const maxHeight = getMaxHeight(type, settings)
  const stat = await components.fs.stat(filePath)
  const originalSize = stat.size

  try {
    const sharp = (await import('sharp')).default
    let pipeline = sharp(filePath)
    const metadata = await pipeline.metadata()

    if (!metadata.width || !metadata.height) {
      return { path: filePath, originalSize, optimizedSize: originalSize, skipped: true, reason: 'unreadable' }
    }

    if (metadata.height > maxHeight) {
      const scale = maxHeight / metadata.height
      pipeline = pipeline.resize(Math.round(metadata.width * scale), maxHeight)
    }

    let outputBuffer: Buffer
    const mimeFormat = settings.format

    if (mimeFormat === 'png') {
      outputBuffer = await pipeline.png({ compressionLevel: 9 }).toBuffer()
    } else if (mimeFormat === 'jpeg') {
      outputBuffer = await pipeline.jpeg({ quality: settings.quality }).toBuffer()
    } else {
      outputBuffer = await pipeline.webp({ quality: settings.quality }).toBuffer()
    }

    if (outputBuffer.length >= originalSize) {
      return { path: filePath, originalSize, optimizedSize: originalSize, skipped: true, reason: 'already optimal' }
    }

    if (!dryRun) {
      let outputPath = filePath
      const currentExt = path.extname(filePath).toLowerCase()
      const targetExt = mimeFormat === 'jpeg' ? '.jpg' : `.${mimeFormat}`

      if (currentExt !== targetExt) {
        outputPath = filePath.replace(/\.[^.]+$/, targetExt)
      }

      await components.fs.writeFile(outputPath, outputBuffer)

      if (outputPath !== filePath) {
        await components.fs.unlink(filePath)
      }

      return { path: outputPath, originalSize, optimizedSize: outputBuffer.length, skipped: false }
    }

    return { path: filePath, originalSize, optimizedSize: outputBuffer.length, skipped: false }
  } catch (error: any) {
    return { path: filePath, originalSize, optimizedSize: originalSize, skipped: true, reason: error?.message || 'error' }
  }
}

// --- Main ---

export async function main(options: Options) {
  printCommand(options.components.logger, 'optimize')

  const workingDirectory = path.resolve(process.cwd(), options.args['--dir'] || '.')
  const dryRun = !!options.args['--dry-run']

  const settings: CompressionSettings = {
    baseColorSize: options.args['--basecolor-size'] ?? 1024,
    normalSize: options.args['--normal-size'] ?? 1024,
    ormSize: options.args['--orm-size'] ?? 512,
    emissiveSize: options.args['--emissive-size'] ?? 512,
    otherSize: options.args['--other-size'] ?? 512,
    quality: options.args['--quality'] ?? 85,
    format: (options.args['--format'] as CompressionSettings['format']) ?? 'png'
  }

  if (!['png', 'jpeg', 'webp'].includes(settings.format)) {
    options.components.logger.error(`Invalid format "${settings.format}". Use: png, jpeg, webp` as any)
    return
  }

  if (settings.quality < 1 || settings.quality > 100) {
    options.components.logger.error('Quality must be between 1 and 100' as any)
    return
  }

  options.components.logger.log(colors.dim('Settings:'))
  options.components.logger.log(colors.dim(`  Format: ${settings.format}  Quality: ${settings.quality}`))
  options.components.logger.log(
    colors.dim(
      `  Max heights — baseColor: ${settings.baseColorSize}  normal: ${settings.normalSize}  orm: ${settings.ormSize}  emissive: ${settings.emissiveSize}  other: ${settings.otherSize}`
    )
  )

  if (dryRun) {
    printWarning(options.components.logger, 'Dry run — no files will be modified')
  }

  options.components.logger.log('')

  // Phase 1: Extract textures from GLB files
  printStep(options.components.logger, `Scanning ${ASSET_DIRS.join(', ')} for GLB files and images...`)

  const { glbFiles } = await collectFiles(options.components, workingDirectory)
  const usedNames = new Set<string>()
  let totalGlbsProcessed = 0
  let totalTexturesExtracted = 0
  let totalGlbSaved = 0

  if (glbFiles.length > 0) {
    options.components.logger.log(`Found ${colors.bold(String(glbFiles.length))} GLB file${glbFiles.length === 1 ? '' : 's'}`)
    options.components.logger.log('')

    for (const glbFile of glbFiles) {
      const relativePath = path.relative(workingDirectory, glbFile)
      const result = await extractGlbTextures(options.components, glbFile, usedNames, dryRun)

      if (result.embeddedCount === 0) {
        options.components.logger.log(colors.dim(`  ${relativePath} — no embedded textures`))
      } else if (dryRun) {
        totalGlbsProcessed++
        totalTexturesExtracted += result.embeddedCount
        options.components.logger.log(
          `  ${relativePath} — ${colors.bold(String(result.embeddedCount))} embedded texture${result.embeddedCount === 1 ? '' : 's'} would be extracted`
        )
      } else {
        totalGlbsProcessed++
        totalTexturesExtracted += result.extractedFiles.length
        const glbSaved = result.originalGlbSize - result.newGlbSize
        totalGlbSaved += glbSaved
        options.components.logger.log(
          `  ${relativePath} — extracted ${colors.bold(String(result.extractedFiles.length))} texture${result.extractedFiles.length === 1 ? '' : 's'} (GLB ${formatBytes(result.originalGlbSize)} → ${colors.greenBright(formatBytes(result.newGlbSize))})`
        )
        for (const f of result.extractedFiles) {
          options.components.logger.log(colors.dim(`    → ${path.relative(workingDirectory, f)}`))
        }
      }
    }
    options.components.logger.log('')
  }

  // Phase 2: Compress all image files (pre-existing + freshly extracted)
  // Re-scan to pick up extracted textures
  const { imageFiles: allImages } = await collectFiles(options.components, workingDirectory)

  if (allImages.length === 0 && glbFiles.length === 0) {
    options.components.logger.log(colors.dim('No image files or GLB files found in assets/ or Models/.'))
    return
  }

  if (allImages.length > 0) {
    printStep(options.components.logger, 'Compressing images...')
    options.components.logger.log(
      `Found ${colors.bold(String(allImages.length))} image ${allImages.length === 1 ? 'file' : 'files'}`
    )
    options.components.logger.log('')

    const results: OptimizationResult[] = []
    const colWidth = 50

    for (let i = 0; i < allImages.length; i++) {
      const file = allImages[i]
      const relativePath = path.relative(workingDirectory, file)
      const progress = colors.dim(`[${i + 1}/${allImages.length}]`)

      const result = await optimizeImage(options.components, file, settings, dryRun)
      results.push(result)

      const displayPath =
        relativePath.length > colWidth ? '...' + relativePath.slice(-(colWidth - 3)) : relativePath.padEnd(colWidth)

      if (result.skipped) {
        const reason = result.reason || 'skipped'
        options.components.logger.log(`${progress} ${colors.dim(displayPath)} ${colors.dim(reason)}`)
      } else {
        const saved = result.originalSize - result.optimizedSize
        const pct = ((saved / result.originalSize) * 100).toFixed(0)
        options.components.logger.log(
          `${progress} ${displayPath} ${formatBytes(result.originalSize)} → ${colors.greenBright(formatBytes(result.optimizedSize))} ${colors.dim(`(-${pct}%)`)}`
        )
      }
    }

    // Summary
    const optimized = results.filter((r) => !r.skipped)
    const skipped = results.filter((r) => r.skipped)
    const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0)
    const totalOptimized = results.reduce((sum, r) => sum + r.optimizedSize, 0)
    const totalSaved = totalOriginal - totalOptimized + totalGlbSaved

    const summaryLines = [
      `  GLBs processed:        ${totalGlbsProcessed}`,
      `  Textures extracted:    ${totalTexturesExtracted}`,
      `  Images processed:      ${results.length}`,
      `  Images compressed:     ${optimized.length}`,
      `  Images skipped:        ${skipped.length}`,
      `  Image size before:     ${formatBytes(totalOriginal)}`,
      `  Image size after:      ${formatBytes(totalOptimized)}`,
      `  Total saved:           ${colors.greenBright(formatBytes(totalSaved))}`
    ].join('\n')

    if (optimized.length > 0 || totalGlbsProcessed > 0) {
      printSuccess(
        options.components.logger,
        dryRun
          ? `${totalGlbsProcessed} GLBs and ${optimized.length} images can be optimized (dry run — no files modified)`
          : `${totalGlbsProcessed} GLBs processed, ${optimized.length} images compressed`,
        summaryLines
      )
    } else {
      options.components.logger.log('')
      options.components.logger.log('All files are already at or below target size. Nothing to optimize.')
    }

    options.components.analytics.track('Optimize scene', {
      projectHash: b64HashingFunction(workingDirectory),
      glbsProcessed: totalGlbsProcessed,
      texturesExtracted: totalTexturesExtracted,
      filesProcessed: results.length,
      filesOptimized: optimized.length,
      totalSaved,
      format: settings.format,
      quality: settings.quality,
      dryRun
    })
  } else if (totalGlbsProcessed > 0) {
    printSuccess(
      options.components.logger,
      dryRun
        ? `${totalGlbsProcessed} GLBs have embedded textures that would be extracted (dry run)`
        : `Extracted textures from ${totalGlbsProcessed} GLB${totalGlbsProcessed === 1 ? '' : 's'}`,
      `  Textures extracted: ${totalTexturesExtracted}\n  GLB size saved: ${colors.greenBright(formatBytes(totalGlbSaved))}`
    )

    options.components.analytics.track('Optimize scene', {
      projectHash: b64HashingFunction(workingDirectory),
      glbsProcessed: totalGlbsProcessed,
      texturesExtracted: totalTexturesExtracted,
      filesProcessed: 0,
      filesOptimized: 0,
      totalSaved: totalGlbSaved,
      format: settings.format,
      quality: settings.quality,
      dryRun
    })
  }
}
