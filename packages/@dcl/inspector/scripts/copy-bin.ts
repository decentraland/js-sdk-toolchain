import fs from 'fs'
import { resolve } from 'path'

console.log('Copying "@dcl/asset-packs/bin/index.js" into "public/bin/index.js"...')
const binDirPath = resolve(__dirname, '../public/bin')
if (!fs.existsSync(binDirPath)) {
  fs.mkdirSync(binDirPath)
}
fs.copyFileSync(
  resolve(__dirname, '../node_modules/@dcl/asset-packs/bin/index.js'),
  resolve(__dirname, '../public/bin/index.js')
)
