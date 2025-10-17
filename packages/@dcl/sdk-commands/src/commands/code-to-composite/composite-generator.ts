import type { IEngine } from '@dcl/ecs'
import {
  dumpEngineToComposite,
  dumpEngineToCrdtCommands,
  generateEntityNamesType,
  FileSystemInterface
} from '@dcl/inspector'
import { CliComponents } from '../../components'
import { createFileSystemInterfaceFromFsComponent } from '../start/data-layer/fs'
import { Composite } from '@dcl/ecs/dist-cjs'

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

  // generate composite JSON
  const composite = dumpEngineToComposite(engine, 'json')
  await fs.writeFile(compositeFilePath, JSON.stringify(Composite.toJson(composite), null, 2))

  // generate CRDT binary
  const crdtData = dumpEngineToCrdtCommands(engine)
  await fs.writeFile(crdtFilePath, crdtData)

  const fsAdapter: FileSystemInterface = createFileSystemInterfaceFromFsComponent({ fs })
  await generateEntityNamesType(engine, entityNamesFilePath, 'EntityNames', fsAdapter)
}
