import fs from 'fs'
import { resolve } from 'path'

console.log('Copying "@dcl/asset-packs/bin/index.js" into "public/scene.js"...')
fs.copyFileSync(
  resolve(__dirname, '../node_modules/@dcl/asset-packs/bin/index.js'),
  resolve(__dirname, '../public/scene.js')
)
