import {
  dumpEngineToComposite,
  dumpEngineToCrdtCommands,
  generateEntityNamesType,
  FileSystemInterface
} from '@dcl/inspector'
import { CliComponents } from '../../components'
import { createFileSystemInterfaceFromFsComponent } from '../start/data-layer/fs'
import { IEngine as IEngineEcs } from '@dcl/ecs'
import { IEngine, Composite } from '@dcl/ecs/dist-cjs'
import * as path from 'path'

async function ensureDirectoryExists({ fs }: Pick<CliComponents, 'fs'>, filePath: string): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
}

/**
 * Generates composite and CRDT files from an ECS engine state.
 */
export async function generateCompositeFiles(
  components: Pick<CliComponents, 'fs' | 'logger'>,
  engine: IEngine,
  compositeFilePath: string,
  crdtFilePath: string,
  entityNamesFilePath: string
): Promise<void> {
  const { fs } = components

  // ensure all directories exist
  await ensureDirectoryExists(components, compositeFilePath)
  await ensureDirectoryExists(components, crdtFilePath)
  await ensureDirectoryExists(components, entityNamesFilePath)

  const _engine = engine as any as IEngineEcs

  // generate composite JSON
  const composite = dumpEngineToComposite(_engine, 'json')
  await fs.writeFile(compositeFilePath, JSON.stringify(Composite.toJson(composite), null, 2))

  // generate CRDT binary
  const crdtData = dumpEngineToCrdtCommands(_engine)
  await fs.writeFile(crdtFilePath, crdtData)

  const fsAdapter: FileSystemInterface = createFileSystemInterfaceFromFsComponent({ fs })
  await generateEntityNamesType(_engine, entityNamesFilePath, 'EntityNames', fsAdapter)
}
