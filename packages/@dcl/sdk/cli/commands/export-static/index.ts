import { resolve } from 'path'
import { getArgs } from '../../logic/args'
import { hashV1 } from '@dcl/hashing'
import { CliComponents } from '../../components'
import { assertValidProjectFolder } from '../../logic/project-validations'
import { getProjectContentMappings } from '../../logic/project-files'
import { CliError } from '../../logic/error'

interface Options {
  args: typeof args
  components: Pick<CliComponents, 'fetch' | 'fs' | 'logger'>
}

export const args = getArgs({
  '--dir': String,
  '--destination': String
})

export async function help() {
  return `  
  Usage:
    sdk-commands export-static --dir <project folder> --destination <directory>

  Description:

    Exports all the contents of the scene as if they were uploaded to a content server

  Options:

    --dir <directory>         The project's root folder to export
    --destination <directory> A path in which all the assets will be stored
`
}

export async function main(options: Options) {
  const { fs, logger } = options.components
  const projectRoot = resolve(process.cwd(), options.args['--dir'] || '.')
  const destDirectory = resolve(process.cwd(), options.args['--destination'] || '.')
  await fs.mkdir(destDirectory, { recursive: true })
  if (!(await fs.directoryExists(destDirectory))) {
    throw new CliError(`The path ${destDirectory} is not a directory`)
  }

  logger.log('Hashing files...')

  await assertValidProjectFolder(options.components, projectRoot)
  const filesToExport = await getProjectContentMappings(options.components, projectRoot, async (file) => {
    return await hashV1(fs.createReadStream(resolve(projectRoot, file)))
  })

  logger.log('Copying files...')

  for (const { file, hash } of filesToExport) {
    const dst = resolve(destDirectory, hash)
    const src = resolve(projectRoot, file)

    if (src.startsWith(destDirectory)) continue

    logger.log(`> ${hash} -> ${file}`)

    if (!(await fs.fileExists(dst))) {
      const content = await fs.readFile(src)
      await fs.writeFile(dst, content)
    }
  }

  logger.log('Generating entity file...')

  // TODO

  logger.log('Export finished')
}
