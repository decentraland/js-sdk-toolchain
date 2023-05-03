import { FileSystemInterface } from '../types'

async function upsertAsset(fs: FileSystemInterface, path: string, content: Uint8Array | null) {
  if (content) {
    await fs.writeFile(path, Buffer.from(content))
  } else {
    await fs.rm(path)
  }
}

export default upsertAsset
