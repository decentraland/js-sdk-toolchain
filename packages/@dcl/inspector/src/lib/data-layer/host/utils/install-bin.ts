import fetch from 'node-fetch'
import { FileSystemInterface } from '../../types'
import { getConfig } from '../../../logic/config'

export async function installBin(fs: FileSystemInterface) {
  const config = getConfig()
  if (config.disableInstallBinJs || process.env.NODE_ENV === 'test') {
    return
  }

  console.log('Installing binaries')
  const bin = await fetch('/scene.js').then((resp) => resp.text())
  await fs.writeFile('bin/index.js', Buffer.from(bin))
}
