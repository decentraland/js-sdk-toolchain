import path from 'path'
import { getArgs, getArgsUsed } from '../../logic/args'
import { hashV1 } from '@dcl/hashing'
import { CliComponents } from '../../components'
import { assertValidProjectFolder } from '../../logic/project-validations'
import { b64HashingFunction, getProjectContentMappings } from '../../logic/project-files'
import { CliError } from '../../logic/error'
import { Entity, EntityType, Scene } from '@dcl/schemas'
import { colors } from '../../components/log'
import { printProgressInfo, printProgressStep, printSuccess } from '../../logic/beautiful-logs'
import { createStaticRealm } from '../../logic/realm'
import { getBaseCoords, getValidSceneJson } from '../../logic/scene-validations'

interface Options {
  args: typeof args
  components: Pick<CliComponents, 'fetch' | 'fs' | 'logger' | 'analytics' | 'config'>
}

export const args = getArgs({
  '--dir': String,
  '--destination': String,
  '--timestamp': String,
  '--realmName': String,
  '--baseUrl': String
})

export async function help() {
  return `
  Usage:
    sdk-commands export-static --dir <directory> --destination <directory>

  Description:

    Exports all the contents of the scene as if they were uploaded to a content server

  Options:

    --dir <directory>         The project's root folder to export
    --destination <directory> A path in which all the assets will be stored
    --timestamp <timestamp>   A date to use in the deployable entity. Defaults to now()
    --realmName <name>        Creates a /<name>/about endpoint to expose the current deployment as a realm. Requires --baseUrl
    --baseUrl <baseUrl>       It is the public URL in which the --destination directory will be avaiable
`
}

export async function main(options: Options) {
  const { fs, logger } = options.components
  const workingDirectory = path.resolve(process.cwd(), options.args['--dir'] || '.')
  const outputDirectory = path.resolve(process.cwd(), options.args['--destination'] || '.')
  const willCreateRealm = !!args['--realmName']
  let currentStep = 1
  const maxSteps = 3 + (willCreateRealm ? 1 : 0)

  if (willCreateRealm && !args['--baseUrl']) {
    throw new CliError(`--baseUrl is mandatory when --realmName is provided`)
  }

  if (willCreateRealm && !/^[a-z][a-z0-9-/]*$/i.test(args['--realmName']!)) {
    throw new CliError(`--realmName has invalid characters`)
  }

  printProgressStep(logger, 'Reading project files...', currentStep++, maxSteps)

  await fs.mkdir(outputDirectory, { recursive: true })
  if (!(await fs.directoryExists(outputDirectory))) {
    throw new CliError(`The destination path ${outputDirectory} is not a directory`)
  }

  const scenesUrn: string[] = []

  const project = await assertValidProjectFolder(options.components, workingDirectory)

  /* istanbul ignore else */
  if (project.workspace) {
    for (const folder of project.workspace.folders) {
      const wd = path.join(workingDirectory, folder.path)
      const scene = await getValidSceneJson(options.components, wd)
      await prepareSceneFiles(options, wd, scene, outputDirectory)
    }
  } else if (project.scene) {
    await prepareSceneFiles(options, workingDirectory, project.scene, outputDirectory)
  } else {
    throw new CliError(`Unknown project type to export: ${Object.keys(project)}`)
  }

  if (willCreateRealm) {
    // prepare the realm object
    printProgressStep(logger, 'Creating realm file...', currentStep++, maxSteps)
    const realm = await createStaticRealm(options.components)
    const realmName = args['--realmName']!

    realm.configurations!.scenesUrn = scenesUrn
    realm.configurations!.realmName = realmName

    // write the realm file
    const realmDirectory = path.join(outputDirectory, realmName)
    await fs.mkdir(realmDirectory, { recursive: true })
    if (!(await fs.directoryExists(realmDirectory))) {
      throw new CliError(`The destination path ${realmDirectory} is not a directory`)
    }
    const dst = path.join(realmDirectory, 'about')
    await fs.writeFile(dst, JSON.stringify(realm, null, 2))
    printProgressInfo(logger, `> ${realmName}/about -> [REALM FILE]`)
  }

  printSuccess(logger, `Export finished!`, `=> The entity URN are ${colors.bold(scenesUrn.join(','))}`)

  return { scenesUrn, destination: outputDirectory }
}

export async function prepareSceneFiles(
  options: Options,
  workingDirectory: string,
  scene: Scene,
  outputDirectory: string
) {
  const { fs, logger } = options.components

  const filesToExport = await getProjectContentMappings(options.components, workingDirectory, async (file) => {
    return await hashV1(fs.createReadStream(path.resolve(workingDirectory, file)))
  })

  printProgressInfo(logger, 'Copying files...')

  for (const { file, hash } of filesToExport) {
    const src = path.resolve(workingDirectory, file)
    const dst = path.resolve(outputDirectory, hash)

    if (src.startsWith(outputDirectory)) continue

    printProgressInfo(logger, `> ${hash} -> ${colors.reset(file)}`)

    if (!(await fs.fileExists(dst))) {
      const content = await fs.readFile(src)
      await fs.writeFile(dst, content)
    }
  }

  // entity with ID are the deployed ones, when we generate the entity the ID is not
  // available because it is the result of hashing the following structure
  const entity: Omit<Entity, 'id'> = {
    content: filesToExport,
    pointers: [],
    timestamp: args['--timestamp'] ? new Date(args['--timestamp']).getTime() : Date.now(),
    type: EntityType.SCENE,
    // for now, the only valid export is for scenes
    metadata: scene,
    version: 'v3'
  }

  printProgressInfo(logger, 'Generating files...')

  // create the entity file and get the entityId
  const entityRaw = Buffer.from(JSON.stringify(entity), 'utf8')
  const entityId = await hashV1(entityRaw)
  const dst = path.resolve(outputDirectory, entityId)
  await fs.writeFile(dst, entityRaw)

  printProgressInfo(logger, `> ${entityId} -> ${colors.reset('[ENTITY FILE]')}`)

  let urn = `urn:decentraland:entity:${entityId}`

  if (args['--baseUrl']) {
    urn += '?baseUrl=' + args['--baseUrl']
    // baseUrl must end with /
    if (!urn.endsWith('/')) urn += '/'
  }

  options.components.analytics.track('Export static', {
    projectHash: await b64HashingFunction(workingDirectory),
    coords: getBaseCoords(scene),
    args: getArgsUsed(options.args)
  })

  return { urn, entityId, destination: outputDirectory }
}
