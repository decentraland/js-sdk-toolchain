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

    Compress and resize image textures in your scene's assets/ and Models/
    directories. Textures are classified by filename convention (e.g.
    _baseColor, _normal, _orm, _emissive) and each type gets its own
    maximum height. Files that would grow after compression are skipped.

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

async function collectImageFiles(
  components: Pick<CliComponents, 'fs'>,
  workingDirectory: string
): Promise<string[]> {
  const files: string[] = []

  for (const dir of ASSET_DIRS) {
    const fullDir = path.join(workingDirectory, dir)
    if (!(await components.fs.directoryExists(fullDir))) continue
    await walkDir(components, fullDir, files)
  }

  return files
}

async function walkDir(
  components: Pick<CliComponents, 'fs'>,
  dirPath: string,
  results: string[]
): Promise<void> {
  const entries = await components.fs.readdir(dirPath)
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry)
    try {
      const stat = await components.fs.stat(fullPath)
      if (stat.isDirectory()) {
        await walkDir(components, fullPath, results)
      } else if (isImageFile(entry)) {
        results.push(fullPath)
      }
    } catch {
      // skip inaccessible entries
    }
  }
}

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

  printStep(options.components.logger, `Scanning for images in ${ASSET_DIRS.join(', ')}...`)

  const files = await collectImageFiles(options.components, workingDirectory)

  if (files.length === 0) {
    options.components.logger.log(colors.dim('No image files found in assets/ or Models/.'))
    return
  }

  options.components.logger.log(`Found ${colors.bold(String(files.length))} image ${files.length === 1 ? 'file' : 'files'}`)
  options.components.logger.log('')

  // Print settings
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

  const results: OptimizationResult[] = []
  const colWidth = 50

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const relativePath = path.relative(workingDirectory, file)
    const progress = colors.dim(`[${i + 1}/${files.length}]`)

    const result = await optimizeImage(options.components, file, settings, dryRun)
    results.push(result)

    const displayPath = relativePath.length > colWidth ? '...' + relativePath.slice(-(colWidth - 3)) : relativePath.padEnd(colWidth)

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
  const totalSaved = totalOriginal - totalOptimized

  const summary = [
    `  Files processed: ${results.length}`,
    `  Files optimized: ${optimized.length}`,
    `  Files skipped:   ${skipped.length}`,
    `  Original size:   ${formatBytes(totalOriginal)}`,
    `  Optimized size:  ${formatBytes(totalOptimized)}`,
    `  Total saved:     ${colors.greenBright(formatBytes(totalSaved))}`
  ].join('\n')

  if (optimized.length > 0) {
    printSuccess(
      options.components.logger,
      dryRun
        ? `${optimized.length} files can be optimized (dry run — no files modified)`
        : `${optimized.length} files optimized successfully`,
      summary
    )
  } else {
    options.components.logger.log('')
    options.components.logger.log('All files are already at or below target size. Nothing to optimize.')
  }

  options.components.analytics.track('Optimize scene', {
    projectHash: b64HashingFunction(workingDirectory),
    filesProcessed: results.length,
    filesOptimized: optimized.length,
    totalSaved,
    format: settings.format,
    quality: settings.quality,
    dryRun
  })
}
