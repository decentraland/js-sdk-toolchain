import { resolve } from 'path'
import { getArgs } from '../../logic/args'
import { hashV1 } from '@dcl/hashing'
import { CliComponents } from '../../components'
import { assertValidProjectFolder } from '../../logic/project-validations'
import { getProjectContentMappings, getSceneJson } from '../../logic/project-files'
import { CliError } from '../../logic/error'
import { Entity, EntityType } from '@dcl/schemas'
import { colors } from '../../components/log'
import { printProgressInfo, printProgressStep, printSuccess } from '../../logic/beautiful-logs'
import { createStaticRealm } from '../../logic/realm'
import { b64HashingFunction } from '../start/server/endpoints'
import { getBaseCoords } from '../../logic/scene-validations'

interface Options {
  args: typeof args
  components: Pick<CliComponents, 'fetch' | 'fs' | 'logger' | 'dclInfoConfig' | 'analytics'>
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
  const projectRoot = resolve(process.cwd(), options.args['--dir'] || '.')
  const destDirectory = resolve(process.cwd(), options.args['--destination'] || '.')
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

  await fs.mkdir(destDirectory, { recursive: true })
  if (!(await fs.directoryExists(destDirectory))) {
    throw new CliError(`The destination path ${destDirectory} is not a directory`)
  }

  const project = await assertValidProjectFolder(options.components, projectRoot)
  const filesToExport = await getProjectContentMappings(options.components, projectRoot, async (file) => {
    return await hashV1(fs.createReadStream(resolve(projectRoot, file)))
  })

  printProgressStep(logger, 'Copying files...', currentStep++, maxSteps)

  for (const { file, hash } of filesToExport) {
    const src = resolve(projectRoot, file)
    const dst = resolve(destDirectory, hash)

    if (src.startsWith(destDirectory)) continue

    printProgressInfo(logger, `> ${hash} -> ${file}`)

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
    metadata: project.scene,
    version: 'v3'
  }

  printProgressStep(logger, 'Generating files...', currentStep++, maxSteps)

  // create the entity file and get the entityId
  const entityRaw = Buffer.from(JSON.stringify(entity), 'utf8')
  const entityId = await hashV1(entityRaw)
  const dst = resolve(destDirectory, entityId)
  await fs.writeFile(dst, entityRaw)

  printProgressInfo(logger, `> ${entityId} -> [ENTITY FILE]`)

  let urn = `urn:decentraland:entity:${entityId}`

  if (args['--baseUrl']) {
    urn += '?baseUrl=' + args['--baseUrl']
    // baseUrl must end with /
    if (!urn.endsWith('/')) urn += '/'
  }

  if (willCreateRealm) {
    // prepare the realm object
    printProgressStep(logger, 'Creating realm file...', currentStep++, maxSteps)
    const realm = createStaticRealm()
    const realmName = args['--realmName']!

    realm.configurations!.scenesUrn = [urn]
    realm.configurations!.realmName = realmName

    // write the realm file
    const realmDirectory = resolve(destDirectory, realmName)
    await fs.mkdir(realmDirectory, { recursive: true })
    if (!(await fs.directoryExists(realmDirectory))) {
      throw new CliError(`The destination path ${realmDirectory} is not a directory`)
    }
    const dst = resolve(realmDirectory, 'about')
    await fs.writeFile(dst, JSON.stringify(realm, null, 2))
    printProgressInfo(logger, `> ${realmName}/about -> [REALM FILE]`)
  }

  printSuccess(logger, `Export finished!`, `=> The entity URN is ${colors.bold(urn)}`)
  const sceneJson = await getSceneJson(options.components, projectRoot)
  const coords = getBaseCoords(sceneJson)

  await options.components.analytics.track('Export static', {
    projectHash: await b64HashingFunction(projectRoot),
    coords
  })

  return { urn, entityId, destination: destDirectory }
}
