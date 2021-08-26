import * as fs from 'fs'
import { sync as globSync } from 'glob'
import * as path from 'path'
import * as http from 'http'
import * as https from 'https'

// instead of using fs-extra, create a custom function to no need to rollup
export async function copyDir(src: string, dest: string) {
  await fs.promises.mkdir(dest, { recursive: true })
  let entries = await fs.promises.readdir(src, { withFileTypes: true })

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name)
    let destPath = path.join(dest, entry.name)

    entry.isDirectory() ? await copyDir(srcPath, destPath) : await fs.promises.copyFile(srcPath, destPath)
  }
}

export function entityV3FromFolder({ folder, addOriginalPath }: { folder: string; addOriginalPath?: boolean }) {
  const sceneJsonPath = path.resolve(folder, './scene.json')

  if (fs.existsSync(sceneJsonPath)) {
    const sceneJson = JSON.parse(fs.readFileSync(sceneJsonPath).toString())

    const { base, parcels }: { base: string; parcels: string[] } = sceneJson.scene
    const pointers = new Set<string>()
    pointers.add(base)
    parcels.forEach(($) => pointers.add($))

    const allFiles = globSync('**/*', {
      cwd: folder,
      dot: false,
      ignore: ['node_modules/**/*', '.git/**/*'],
      absolute: true
    })
      .map((file) => {
        try {
          if (!fs.statSync(file).isFile()) return
        } catch (err) {
          return
        }
        const _folder = folder.replace(/\\/gi, '/')
        const key = file.replace(_folder, '').replace(/^\/+/, '')

        if (addOriginalPath) {
          return { file: key.toLowerCase(), original_path: key, hash: 'b64-' + Buffer.from(file).toString('base64') }
        } else {
          return { file: key.toLowerCase(), hash: 'b64-' + Buffer.from(file).toString('base64') }
        }
      })
      .filter(($) => !!$)

    return {
      version: 'v3',
      type: 'scene',
      id: 'b64-' + Buffer.from(folder).toString('base64'),
      pointers: Array.from(pointers),
      timestamp: Date.now(),
      metadata: sceneJson,
      content: allFiles
    }
  }

  return null
}

export function getSceneJson({ baseFolders, pointers }: { baseFolders: string[]; pointers: string[] }) {
  const requestedPointers = new Set<string>(pointers)
  const resultEntities = []
  const allDeployments = baseFolders.map((folder) => entityV3FromFolder({ folder }))

  for (let pointer of Array.from(requestedPointers)) {
    // get deployment by pointer
    const theDeployment = allDeployments.find(($) => $ && $.pointers.includes(pointer))
    if (theDeployment) {
      // remove all the required pointers from the requestedPointers set
      // to prevent sending duplicated entities
      theDeployment.pointers.forEach(($) => requestedPointers.delete($))

      // add the deployment to the results
      resultEntities.push(theDeployment)
    }
  }

  return resultEntities
}

export async function ensureWriteFile(filePath: string, data: any) {
  const directoryPath = path.dirname(filePath)
  if (!fs.existsSync(directoryPath)) {
    await fs.promises.mkdir(directoryPath, { recursive: true })
  }

  await fs.promises.writeFile(filePath, data, 'utf-8')
}

export async function ensureCopyFile(fromFilePath: string, filePath: any) {
  const directoryPath = path.dirname(filePath)
  if (!fs.existsSync(directoryPath)) {
    await fs.promises.mkdir(directoryPath, { recursive: true })
  }

  await fs.promises.copyFile(fromFilePath, filePath)
}

export const downloadFile = async (url: string, path: string) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path)

    let schema = http
    if (url.toLowerCase().startsWith('https:')) {
      schema = https as any
    }

    schema
      .get(url, function (response) {
        response.pipe(file)
        file.on('finish', function () {
          file.close()
          resolve(true)
        })
      })
      .on('error', function (err) {
        fs.unlinkSync(path)
        reject(err)
      })
  })
}
