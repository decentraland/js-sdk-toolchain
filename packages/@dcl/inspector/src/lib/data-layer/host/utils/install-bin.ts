import fetch from 'node-fetch'
import { FileSystemInterface } from '../../types'

export async function installBin(fs: FileSystemInterface) {
  const params = new URLSearchParams(location.search)
  if (params.has('DISABLE_INSTALL_BIN') || process.env.NODE_ENV === 'test') {
    return
  }

  console.log('Installing binaries')
  const bin = await fetch('/scene.js').then((resp) => resp.text())
  await fs.writeFile('bin/index.js', Buffer.from(bin))
}
