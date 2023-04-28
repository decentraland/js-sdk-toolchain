import mitt from 'mitt'

import { FileSystemInterface } from '../types'

type FileSystemEvent = { change: unknown }
export const fileSystemEvent = mitt<FileSystemEvent>()

async function upsertAsset(fs: FileSystemInterface, path: string, content: Uint8Array | null) {
  if (content) {
    await fs.writeFile(path, Buffer.from(content))
  } else {
    await fs.rm(path)
  }
  fileSystemEvent.emit('change')
}

export default upsertAsset
