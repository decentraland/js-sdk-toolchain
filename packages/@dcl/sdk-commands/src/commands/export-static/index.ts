import path from 'path'
import { declareArgs } from '../../logic/args'
import { hashV1 } from '@dcl/hashing'
import { CliComponents } from '../../components'
import { SceneProject } from '../../logic/project-validations'
import {
  getProjectPublishableFilesWithHashes,
  b64HashingFunction,
  projectFilesToContentMappings
} from '../../logic/project-files'
import { CliError } from '../../logic/error'
import { Entity, EntityType } from '@dcl/schemas'
import { colors } from '../../components/log'
import {
  printCurrentProjectStarting,
  printProgressInfo,
  printProgressStep,
  printStep,
  printSuccess,
  printWarning
} from '../../logic/beautiful-logs'
import { createStaticRealm } from '../../logic/realm'
import { getBaseCoords } from '../../logic/scene-validations'
import { getValidWorkspace } from '../../logic/workspace-validations'
import { Result } from 'arg'

interface Options {
  args: Result<typeof args>
  components: Pick<CliComponents, 'fetch' | 'fs' | 'logger' | 'analytics' | 'config'>
}

export const args = declareArgs({
  '--dir': String,
  '--destination': String,
  '--timestamp': String,
  '--realmName': String,
  '--commsAdapter': String,
  '--baseUrl': String
})

export async function help(options: Options) {
  options.components.logger.log(`
  Usage:
    sdk-commands export-static --dir <directory> --destination <directory>

  Description:

    Exports all the contents of the scene as if they were uploaded to a content server

  Options:

    --dir <directory>         The project's root folder to export
    --destination <directory> A path in which all the assets will be stored
    --timestamp <timestamp>   A date to use in the deployable entity. Defaults to now()
    --realmName <name>        Creates a /<name>/about endpoint to expose the current deployment as a realm. Requires --baseUrl
    --commsAdapter <url>      URL of the communications adapter (https://adr.decentraland.org/adr/ADR-180)
    --baseUrl <baseUrl>       It is the public URL in which the --destination directory will be avaiable
`)
}

export async function main(options: Options) {
  const { fs, logger } = options.components
  const workingDirectory = path.resolve(process.cwd(), options.args['--dir'] || '.')
  const outputDirectory = path.resolve(process.cwd(), options.args['--destination'] || '.')
  const willCreateRealm = !!options.args['--realmName']
  const commsAdapter = options.args['--commsAdapter'] ?? 'offline:offline'
  let currentStep = 1
  const maxSteps = 1 + (willCreateRealm ? 1 : 0)

  /* istanbul ignore if */
  if (willCreateRealm && !options.args['--baseUrl']) {
    throw new CliError(`--baseUrl is mandatory when --realmName is provided`)
  }

  /* istanbul ignore if */
  if (willCreateRealm && !/^[a-z][a-z0-9-/]*$/i.test(options.args['--realmName']!)) {
    throw new CliError(`--realmName has invalid characters`)
  }

  await fs.mkdir(outputDirectory, { recursive: true })

  /* istanbul ignore if */
  if (!(await fs.directoryExists(outputDirectory))) {
    throw new CliError(`The destination path ${outputDirectory} is not a directory`)
  }

  const scenesUrn: string[] = []
  const entities: string[] = []

  const workspace = await getValidWorkspace(options.components, workingDirectory)

  printProgressStep(logger, `Exporting ${workspace.projects.length} project(s)`, currentStep++, maxSteps)

  for (const project of workspace.projects) {
    printCurrentProjectStarting(options.components.logger, project, workspace)
    if (project.kind === 'scene') {
      const result = await prepareSceneFiles(options, project, outputDirectory)
      scenesUrn.push(result.urn)
      entities.push(result.entityId)
    }
  }

  if (willCreateRealm) {
    // prepare the realm object
    printProgressStep(logger, 'Creating realm file...', currentStep++, maxSteps)
    const realm = await createStaticRealm(options.components)
    const realmName = options.args['--realmName']!

    realm.configurations!.scenesUrn = scenesUrn
    realm.configurations!.realmName = realmName
    if (realm.comms) {
      realm.comms.fixedAdapter = commsAdapter
    }

    // write the realm file
    const realmDirectory = path.join(outputDirectory, realmName)
    await fs.mkdir(realmDirectory, { recursive: true })

    /* istanbul ignore if */
    if (!(await fs.directoryExists(realmDirectory))) {
      throw new CliError(`The destination path ${realmDirectory} is not a directory`)
    }
    const dst = path.join(realmDirectory, 'about')
    await fs.writeFile(dst, JSON.stringify(realm, null, 2))
    printProgressInfo(logger, `> ${realmName}/about ← [REALM FILE]`)
  }

  printSuccess(
    logger,
    `Export finished!`,
    `=> The entity URN are:${colors.bold(scenesUrn.map(($) => '\n - ' + $).join(''))}`
  )

  return { scenesUrn, destination: outputDirectory, entities }
}

export async function prepareSceneFiles(options: Options, project: SceneProject, outputDirectory: string) {
  const { fs, logger } = options.components

  const filesToExport = await getProjectPublishableFilesWithHashes(
    options.components,
    project.workingDirectory,
    async (file) => {
      return await hashV1(fs.createReadStream(path.resolve(project.workingDirectory, file)))
    }
  )

  printStep(logger, 'Exporting static project')

  for (const { absolutePath, hash } of filesToExport) {
    const dst = path.resolve(outputDirectory, hash)

    /* istanbul ignore if */
    if (absolutePath.startsWith(outputDirectory)) {
      printWarning(
        options.components.logger,
        `The file ${absolutePath} was omitted because it overwrites an input directory`
      )
      continue
    }

    printProgressInfo(logger, `> ${hash} ← ${colors.reset(absolutePath)}`)

    if (!(await fs.fileExists(dst))) {
      const content = await fs.readFile(absolutePath)
      await fs.writeFile(dst, content)
    }
  }

  // entity with ID are the deployed ones, when we generate the entity the ID is not
  // available because it is the result of hashing the following structure
  const entity: Omit<Entity, 'id'> = {
    content: projectFilesToContentMappings(project.workingDirectory, filesToExport),
    pointers: [],
    timestamp: options.args['--timestamp'] ? new Date(options.args['--timestamp']).getTime() : Date.now(),
    type: EntityType.SCENE,
    // for now, the only valid export is for scenes
    metadata: project.scene,
    version: 'v3'
  }

  // create the entity file and get the entityId
  const entityRaw = Buffer.from(JSON.stringify(entity), 'utf8')
  const entityId = await hashV1(entityRaw)
  const dst = path.resolve(outputDirectory, entityId)
  await fs.writeFile(dst, entityRaw)

  printStep(logger, `> ${entityId} ← ${colors.reset('[ENTITY FILE]')}`)

  let urn = `urn:decentraland:entity:${entityId}`

  if (options.args['--baseUrl']) {
    urn += '?=&baseUrl=' + options.args['--baseUrl']
    // baseUrl must end with /
    if (!urn.endsWith('/')) urn += '/'
  }

  options.components.analytics.track('Export static', {
    projectHash: await b64HashingFunction(project.workingDirectory),
    coords: getBaseCoords(project.scene)
  })

  return { urn, entityId, destination: outputDirectory }
}
